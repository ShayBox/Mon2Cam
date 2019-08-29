#!/bin/bash

# Default Variables
DEVICE_NUMBER=50
FPS=60
# End Default Variables

# Options
while [ ! $# -eq 0 ]
do
	case "$1" in
		-h | --help)
			echo "$0 - Monitor to Camera"
			echo ""
			echo "$0 [option] [value]"
			echo ""
			echo "options:"
			echo "-h, --help                show help"
			echo "-f, --framerate=FPS       set framerate"
			echo "-d, --device-number=NUM   set device number"
			echo "-m, --monitor-number=NUM  set monitor number"
			echo "-vf, --vertical-flip      vertically flip the monitor capture"
			echo "-hf, --horizontal-flip    horizontally flip the monitor capture"
			echo "-r, --resolution H:W      manually set output resolution"
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
			VFLIP="-vf vflip"
		;;
		-hf | --horizontal-flip)
			HFLIP="-vf hflip"
		;;
		-r | --resolution)
			RES="-vf scale=$2"
		;;
	esac
	shift
done
# End Options

# Dependency checking
XRANDR=$(command -v xrandr)
if ! [ -x $XRANDR ]
then
	echo "Error: xrandr is not installed."
	exit 1
fi

FFMPEG=$(command -v ffmpeg)
if ! [ -x $FFMPEG ]
then
	echo "Error: ffmpeg is not installed."
	exit 1
fi
# End Dependency checking

# Option checking
if [ -z $MONITOR_NUMBER ]
then
	$XRANDR --listactivemonitors
	read -p "Which monitor: " MONITOR_NUMBER
fi
# End Option checking

# Monitor information
MONITOR_INFO=`xrandr --listactivemonitors | grep "$MONITOR_NUMBER:" | cut -f4 -d' '`
MONITOR_HEIGHT=`echo $MONITOR_INFO | cut -f2 -d'/' | cut -f2 -d'x'`
MONITOR_WIDTH=`echo $MONITOR_INFO | cut -f1 -d'/'`
MONITOR_X=`echo $MONITOR_INFO | cut -f2 -d'+'`
MONITOR_Y=`echo $MONITOR_INFO | cut -f3 -d'+'`
# End Monitor information

# Start Mon2Cam
if ! $(sudo modprobe -r v4l2loopback &> /dev/null)
then
    echo "Turn off any sources using Mon2Cam before starting script"
    exit 1
fi

sudo modprobe v4l2loopback video_nr=$DEVICE_NUMBER 'card_label=Mon2Cam'

echo "CTRL + C to stop"
echo "Your screen will look mirrored for you, not others"
$FFMPEG -f x11grab -r $FPS -s "$MONITOR_WIDTH"x"$MONITOR_HEIGHT" -i "$DISPLAY"+"$MONITOR_X","$MONITOR_Y" -vcodec rawvideo $RES $VFLIP $HFLIP -pix_fmt yuv420p -threads 0 -f v4l2 /dev/video$DEVICE_NUMBER &> /dev/null
# End Mon2Cam
