#!/usr/bin/env bash

set -o pipefail
set -o nounset

# Default variables
FPS=60
DEVICE_NUMBER=50
MONITOR_NUMBER=
FFMPEG_OPTIONS=
BORDER=false
SOUND=false
OUTPUT=/dev/null

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
			echo "-h,  --help               show help"
			echo "-f,  --framerate FPS      set framerate"
			echo "-d,  --device-number NUM  set device number"
			echo "-m,  --monitor-number NUM set monitor number"
			echo "-r,  --resolution W:H     manually set output resolution"
			echo "-vf, --vertical-flip      vertically flip the monitor capture"
			echo "-hf, --horizontal-flip    horizontally flip the monitor capture"
			echo "-b,  --border             add border when scaling to avoid stretching"
			echo "-s,  --sound              create virtual sink and route sound into it (requires pulseaudio)"
			echo "-v,  --verbose            Show verbose output"
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
		-r | --resolution)
			FFMPEG_OPTIONS+="-vf scale=$2"
			RESOLUTION=$2
		;;
		-vf | --vertical-flip)
			FFMPEG_OPTIONS+="-vf vflip"
		;;
		-hf | --horizontal-flip)
			FFMPEG_OPTIONS+="-vf hflip"
		;;
		-b | --border)
			BORDER=true
		;;
		-s | --sound)
			SOUND=true
		;;
		-v | --verbose)
            OUTPUT=/dev/tty
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

# Reload v4l2loopback if device doesn't exist
if [ ! -c /dev/video"$DEVICE_NUMBER" ]
then
	# Unload v4l2loopback module
	if ! $(sudo modprobe -r v4l2loopback &> /dev/null)
	then
		echo "Unable to unload v4l2loopback, make sure you installed v4l2loopback and close any programs using virtual video devices and try again."
		exit 1
	fi

	# Load v4lwloopback module
	sudo modprobe v4l2loopback video_nr="$DEVICE_NUMBER" 'card_label=Mon2Cam'
fi

# Option checking
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

# Pick monitor
if [ -z "$MONITOR_NUMBER" ]
then
	$XRANDR --listactivemonitors
	read -r -p "Which monitor: " MONITOR_NUMBER
fi

# AUDIO

### $1: VIRTUAL_SINK
### $2: VIRTUAL_SINK_DESCRIPTION
create_sink_if_not_present() {
	VIRTUAL_SINK=$1
	VIRTUAL_SINK_DESCRIPTION=$2
	GREP_VIRTUAL_SINK=`pacmd list-sinks | grep "$VIRTUAL_SINK_DESCRIPTION"`
	if [ -z "$GREP_VIRTUAL_SINK" ]
	then
		VIRTUAL_SINK_INDEX=`pactl load-module module-null-sink sink_name=$VIRTUAL_SINK`
		echo "Created VirtualSink with index: $VIRTUAL_SINK_INDEX"
		pacmd "update-sink-proplist "$VIRTUAL_SINK" device.description='$VIRTUAL_SINK_DESCRIPTION'"
		pacmd "update-source-proplist $VIRTUAL_SINK.monitor device.description=\"Monitor of $VIRTUAL_SINK_DESCRIPTION\"" # The double-escaped quotes are not a mistake: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	else
		echo "Found a $VIRTUAL_SINK re-using it."
	fi
}


if [ "$SOUND" = true ]
then
	
	# VS_APP Is responsible for combining the sound of the applications. Both the host and the client will hear this.
	VS_APP="VirtualSinkAPP"
	VS_APP_DESCRIPTION="Mon2Cam application sink"

	# VS_MIC Is responsible for combining the devices that only the client will hear. (Mainly microphones)
	VS_MIC="VirtualSinkMIC"
	VS_MIC_DESCRIPTION="Mon2Cam microphone sink"

	# Create virtual sinks if not already present
	create_sink_if_not_present "$VS_APP" "$VS_APP_DESCRIPTION"
	create_sink_if_not_present "$VS_MIC" "$VS_MIC_DESCRIPTION"

	# Loop the application virtual sink back to the user so he can hear it too.
	# Also loop the application virtual sink to the microphone virtual sink
	# TODO: Detect if this module is already created and reuse it
	#(pactl load-module module-loopback source="$VS_APP.monitor" 1>/dev/null) 2>&1
	(pactl load-module module-loopback source="$VS_APP.monitor" 1>/dev/null) 2>&1
	(pactl load-module module-loopback source="$VS_APP.monitor" sink=$VS_MIC 1>/dev/null) 2>&1

	# Move selected playback onto virtual sink
	SINK_INPUTS=`pacmd list-sink-inputs | tr '\n' '\r' | perl -pe 's/ *index: ([0-9]+).+?application\.name = "([^\r]+)"\r.+?(?=index:|$)/\2:\1\r/g' | tr '\r' '\n'` # Display indexes
	echo "$SINK_INPUTS"

	read -r -p "Select which window(s) to route (Space separated list e.g.:3 5):" ROUTED_SINKS
	IFS=' ' read -ra ROUTED_SINKS_ARRAY <<< "$ROUTED_SINKS"
	for sink in "${ROUTED_SINKS_ARRAY[@]}"
	do
		# TODO: Remove hardcoded string (VirtualSinkAPP). For some reason I couldn't get this to work without this. Need to investigate later.
		if [ -n "`pacmd move-sink-input $sink \"VirtualSinkAPP\"`" ]
		then
			echo "Error encountered while trying to move sink input. Check if you entered a correct id or correct ids."
			exit 1
		fi
	done

	# Move selected microphone input to the virtual sink
	SOURCES=`pacmd list-sources | tr '\n' '\r' | perl -pe 's/ *index: ([0-9]+).+?device\.description = "([^\r]+)"\r.+?(?=index:|$)/\2:\1\r/g' | tr '\r' '\n'` # Display indexes
	echo "$SOURCES"

	read -r -p "Select which source(s) to route (Space separated list e.g.:3 5):" ROUTED_SOURCES
	IFS=' ' read -ra ROUTED_SOURCES_ARRAY <<< "$ROUTED_SOURCES"
	for source in "${ROUTED_SOURCES_ARRAY[@]}"
	do
		# TODO: Detect if this module is already created and reuse it
		if [ -n "`(pactl load-module module-loopback source=$source sink=\"$VS_MIC\" 1>/dev/null) 2>&1`" ]
		then
			echo "Error encountered while trying to move microphone into the virtual sink. Check if you entered a correct id or correct ids."
			exit 1
		fi
	done
fi

# Monitor information
MONITOR_INFO=$(xrandr --listactivemonitors | grep "$MONITOR_NUMBER:" | cut -f4 -d' ')
MONITOR_HEIGHT=$(echo "$MONITOR_INFO" | cut -f2 -d'/' | cut -f2 -d'x')
MONITOR_WIDTH=$(echo "$MONITOR_INFO" | cut -f1 -d'/')
MONITOR_X=$(echo "$MONITOR_INFO" | cut -f2 -d'+')
MONITOR_Y=$(echo "$MONITOR_INFO" | cut -f3 -d'+')

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
	/dev/video"$DEVICE_NUMBER"  &> $OUTPUT
