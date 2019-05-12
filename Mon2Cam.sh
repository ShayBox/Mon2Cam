#!/bin/bash

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

MONITOR_COUNT=$($XRANDR --listactivemonitors | wc -l)
if (( $MONITOR_COUNT <= 2 ))
then
  echo "Error: you only have one monitor."
  exit 1
fi

NUMBER=10
DEVICE="/dev/video$NUMBER"
if [ -f $DEVICE ]
then
  echo "Error: $DEVICE exists"
  exit 1
fi

sudo modprobe -r v4l2loopback
sudo modprobe v4l2loopback video_nr=$NUMBER 'card_label=Mon2Cam'

$XRANDR --listactivemonitors
read -p "Which monitor: " MONITOR_NUMBER
read -p "What framerate: " FPS

MONITOR_INFO=`xrandr --listactivemonitors | grep "$MONITOR_NUMBER:" | cut -f4 -d' '`
MONITOR_HEIGHT=`echo $MONITOR_INFO | cut -f2 -d'/' | cut -f2 -d'x'`
MONITOR_WIDTH=`echo $MONITOR_INFO | cut -f1 -d'/'`
MONITOR_X=`echo $MONITOR_INFO | cut -f2 -d'+'`
MONITOR_Y=`echo $MONITOR_INFO | cut -f3 -d'+'`

echo "CTRL + C to stop"
$FFMPEG -f x11grab -r $FPS -s "$MONITOR_WIDTH"x"$MONITOR_HEIGHT" -i "$DISPLAY"+"$MONITOR_X","$MONITOR_Y" -vcodec rawvideo -pix_fmt yuv420p -threads 0 -f v4l2 $DEVICE &> /dev/null

sudo modprobe -r v4l2loopback