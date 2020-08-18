#!/usr/bin/sh

# Full URL used to prevent possible security attacks or deal urls
INSERT='alias mon2cam="deno run --unstable -A -r -q https://raw.githubusercontent.com/ShayBox/Mon2Cam/master/src/mod.ts"'

case $SHELL in
  /bin/bash)
    LOCATION=~/.bashrc
  ;;

  /bin/zsh|/usr/bin/zsh)
    LOCATION=~/.zshrc
  ;;

  *)
    echo "Unknown shell $SHELL"
    exit 1
  ;;
esac

echo "Installing alias for $SHELL"
echo $INSERT >> $LOCATION
