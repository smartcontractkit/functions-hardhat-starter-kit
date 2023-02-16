#!/bin/zsh

cd contracts/dev/functions
for f in *
do
	echo "\n\n######################## DIFF for ${f}"
	diff ${f} ~/chainlink/contracts/src/v0.8/dev/functions/${f}
done

cd ../ocr2
for f in *
do
	echo "\n\n######################## DIFF for ${f}"
	diff ${f} ~/chainlink/contracts/src/v0.8/dev/ocr2/${f}
done

cd ../interfaces
for f in *
do
	echo "\n\n######################## DIFF for ${f}"
	diff ${f} ~/chainlink/contracts/src/v0.8/dev/interfaces/${f}
done
