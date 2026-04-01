#!/bin/bash
export ZYPAK_EXPOSE_WIDEVINE=0
exec zypak-wrapper /app/bin/electron /app/share/srcbox "$@"
