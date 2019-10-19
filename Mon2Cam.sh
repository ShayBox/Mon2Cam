#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

# Variables
FPS=60
DEVICE_NUMBER=50
MONITOR_NUMBER=
FFMPEG_OPTIONS=
BORDER=false

# Options
while [ ! $# -eq 0 ]
do
	case "$1" in
		-h | --help)
			echo "$0 - Monitor to Camera"
			echo ""
			echo "$0 [options] [value]"
			echo ""
			echo "options:"
			echo "-h,  --help                show help"
			echo "-f,  --framerate=FPS       set framerate"
			echo "-d,  --device-number=NUM   set device number"
			echo "-m,  --monitor-number=NUM  set monitor number"
			echo "-vf, --vertical-flip      vertically flip the monitor capture"
			echo "-hf, --horizontal-flip    horizontally flip the monitor capture"
			echo "-r,  --resolution H:W      manually set output resolution"
			echo "-b,  --border              add border when scaling to avoid stretching"
			exit
		;;
		-f | --framerate)
			FPS=$2
		;;
		-d | --device-number)
			DEVICE_NUMBER=$2
		;;
		-m | --monitor-number)
			MONITOR_NUMBER=$2
		;;
		-vf | --vertical-flip)
			FFMPEG_OPTIONS+="-vf vflip"
		;;
		-hf | --horizontal-flip)
			FFMPEG_OPTIONS+="-vf hflip"
		;;
		-r | --resolution)
			FFMPEG_OPTIONS+="-vf scale=$2"
		;;
		-b | --border)
			BORDER=true
		;;
	esac
	shift
done

# Dependency checking
XRANDR=$(command -v xrandr)
if ! [ -x "$XRANDR" ]
then
	echo "Error: xrandr is not installed."
	exit 1
fi

FFMPEG=$(command -v ffmpeg)
if ! [ -x "$FFMPEG" ]
then
	echo "Error: ffmpeg is not installed."
	exit 1
fi

# Option checking
if [ -z "$MONITOR_NUMBER" ]
then
	$XRANDR --listactivemonitors
	read -r -p "Which monitor: " MONITOR_NUMBER
fi

if [ "$BORDER" = true ]
then
	if [ -z "$RESOLUTION" ]
	then
		echo "You didn't specify a resolution (-r 1920:1080)"
		exit 1
	fi

	RES_WIDTH=$(echo "${RESOLUTION}" | cut -f2 -d'=' | cut -f1 -d':');
	RES_HEIGHT=$(echo "${RESOLUTION}" | cut -f2 -d':');
	RESOLUTION="${RESOLUTION}:force_original_aspect_ratio=decrease,pad=$RES_WIDTH:$RES_HEIGHT:x=($RES_WIDTH-iw)/2:y=($RES_HEIGHT-ih)/2"
fi

# Monitor information
MONITOR_INFO=$(xrandr --listactivemonitors | grep "$MONITOR_NUMBER:" | cut -f4 -d' ')
MONITOR_HEIGHT=$(echo "$MONITOR_INFO" | cut -f2 -d'/' | cut -f2 -d'x')
MONITOR_WIDTH=$(echo "$MONITOR_INFO" | cut -f1 -d'/')
MONITOR_X=$(echo "$MONITOR_INFO" | cut -f2 -d'+')
MONITOR_Y=$(echo "$MONITOR_INFO" | cut -f3 -d'+')

# Unload v4l2loopback module
if ! $(sudo modprobe -r v4l2loopback &> /dev/null)
then
	echo "Turn off any sources using Mon2Cam before starting script"
	exit 1
fi

# Load v4lwloopback module
sudo modprobe v4l2loopback video_nr="$DEVICE_NUMBER" 'card_label=Mon2Cam'

# Use x11grab to stream screen into v4l2loopback device
echo "CTRL + C to stop"
echo "Your screen will look mirrored for you, not others"
$FFMPEG \
	-f x11grab \
	-r "$FPS" \
	-s "$MONITOR_WIDTH"x"$MONITOR_HEIGHT" \
	-i "$DISPLAY"+"$MONITOR_X","$MONITOR_Y" \
	$FFMPEG_OPTIONS \
	-pix_fmt yuv420p \
	-f v4l2 \
	/dev/video"$DEVICE_NUMBER" &> /dev/null