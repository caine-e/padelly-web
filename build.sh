#!/bin/sh

set -eu

output_dir="dist"

rm -rf "$output_dir"
mkdir -p "$output_dir"

cp -R \
  404.html \
  _routes.json \
  about \
  index.html \
  llms.txt \
  robots.txt \
  sitemap.xml \
  assets \
  apple-watch-padel-scoring \
  padel-scoring-formats \
  imprint \
  privacy \
  support \
  de \
  es \
  "$output_dir/"
