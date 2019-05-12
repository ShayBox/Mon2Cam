#!/bin/bash

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
if [ -z $DEVICE_NUMBER ]
then
    export DEVICE_NUMBER=10
fi

if [ -z $FPS ]
then
    export FPS=60
fi

if [ -z $MONITOR_NUMBER ]
then
    $XRANDR --listactivemonitors
    read -p "Which monitor: " MONITOR_NUMBER
fi

DEVICE="/dev/video$DEVICE_NUMBER"
if [ -f $DEVICE ]
then
    echo "Error: $DEVICE exists, change in file"
    exit 1
fi
# End Option checking

# Monitor information
MONITOR_INFO=`xrandr --listactivemonitors | grep "$MONITOR_NUMBER:" | cut -f4 -d' '`
MONITOR_HEIGHT=`echo $MONITOR_INFO | cut -f2 -d'/' | cut -f2 -d'x'`
MONITOR_WIDTH=`echo $MONITOR_INFO | cut -f1 -d'/'`
MONITOR_X=`echo $MONITOR_INFO | cut -f2 -d'+'`
MONITOR_Y=`echo $MONITOR_INFO | cut -f3 -d'+'`
# End Monitor information

sudo modprobe -r v4l2loopback
sudo modprobe v4l2loopback video_nr=$DEVICE_NUMBER 'card_label=Mon2Cam'

echo "CTRL + C to stop"
$FFMPEG -f x11grab -r $FPS -s "$MONITOR_WIDTH"x"$MONITOR_HEIGHT" -i "$DISPLAY"+"$MONITOR_X","$MONITOR_Y" -vcodec rawvideo -pix_fmt yuv420p -threads 0 -f v4l2 $DEVICE &> /dev/null

sudo modprobe -r v4l2loopback