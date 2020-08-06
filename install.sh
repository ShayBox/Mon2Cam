#!/usr/bin/sh

# Full URL used to prevent possible security attacks or deal urls
INSERT='alias mon2cam="deno run --unstable --allow-run --allow-read --allow-env -r -q https://raw.githubusercontent.com/ShayBox/Mon2Cam/deno-rewrite/src/mod.ts"'

case $SHELL in
  /bin/bash)
    LOCATION=~/.bashrc
  ;;

  /bin/zsh)
    LOCATION=~/.zshrc
  ;;

  *)
    echo "Unknown shell $SHELL"
    exit 1
  ;;
esac

echo "Installing alias for $SHELL"
echo $INSERT >> $LOCATION