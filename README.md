# Mon2Cam
Fix for multi-monitor Discord screensharing

Dependencies:
-
- [Deno]
- [xrandr]
- [ffmpeg]
- [v4l2loopback] 0.12+

Note:
Ubuntu 18.04 and below does not provide v4l2loopback 0.12, if you use older versions of Ubuntu you will need to [compile from source](https://github.com/umlaeute/v4l2loopback#install)

Instructions:
-
- Install [Deno]
- Install [dependencies](#dependencies)
- Download `Mon2Cam.sh`
- Allow execution `chmod +x Mon2Cam.sh`
- Execute `./Mon2Cam.sh`
- Switch discord webcam

Or use the [AUR package](https://aur.archlinux.org/packages/mon2cam-git/)

```
Mon2Cam - Monitor 2 Camera

Mon2Cam [options] [value]

options:
-h,  --help,       Show help
-f,  --framerate,  Set framerate
-d,  --device,     Set device number
-m,  --monitor,    Set monitor number
-r,  --resolution, Set output resolution (W:H)
-vf, --vflip,      Vertically flip the camera
-hf, --hflip,      Horizontally flip the camera
-b,  --border,     Add border when scaling to avoid stretching
-s,  --sound,      Create virtual sink and route sound into it
-v,  --verbose,    Show verbose output

To find out more, visit https://github.com/shaybox/mon2cam
```

```
Monitors: 3
 0: +*DP-0 1920/531x1080/299+1366+0  DP-0
 1: +DP-2 1366/410x768/230+3286+0  DP-2
 2: +HDMI-0 1366/410x768/230+0+0  HDMI-0
Which monitor: 0
CTRL + C to stop
Your screen will look mirrored for you, not others
```

![Screenshot](images/discord_webcam.png)


Audio routing
-

There is a built in audio streaming feature, but it's quite **experimental**. It uses *pulseaudio* to route the audio of your microphone (or any other input) and the sound of any selected output(application) into a virtual sink which then you can select as an input in discord.

To use, pass the `-s` option, select the appropriate applications and sources (You have to pass a space separated list of ids, or a single id). Then, set the default recording device to be the VirtualSink Monitor and then instruct discord to record from the monitor of the VirtualSink. After this, you should disable noise cancellation and noise reduction in discord, to achieve a good quality stream. 

Also **note** that in the current implementation, if you use this feature, you won't be able to hear the selected application(s), only the people listening to the stream. You can workaround this by using a command like: `ffplay -f pulse -i default -nodisp` and then changing the recorded source in *pavucontrol*, however you will also hear any inputs that you might have passed (so if you passed your microphone, you will hear yourself).

![Screenshot_Pavucontrol](images/pavucontrol.png)

[Deno]:https://deno.land/
[xrandr]:https://www.x.org/releases/X11R7.7/doc/man/man1/xrandr.1.xhtml
[ffmpeg]:http://ffmpeg.org/
[v4l2loopback]:https://github.com/umlaeute/v4l2loopback