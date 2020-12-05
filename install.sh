#!/usr/bin/sh

# Full URL used to prevent possible security attacks or deal urls
INSERT='alias mon2cam="deno run --unstable -A -r -q https://raw.githubusercontent.com/ShayBox/Mon2Cam/master/src/mod.ts"'

case $SHELL in
  /bin/bash|/usr/bin/bash)
    LOCATION=~/.bashrc
  ;;

  /bin/zsh|/usr/bin/zsh)
    LOCATION=~/.zshrc
  ;;
  
  /bin/fish|/usr/bin/fish)
    LOCATION=~/.config/fish/config.fish
    ;;

  *)
    echo "Unknown shell $SHELL"
    exit 1
  ;;
esac

echo $INSERT >> $LOCATION
echo "Installed alias for $SHELL"
echo "Reload your shell"
