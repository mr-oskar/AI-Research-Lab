#!/bin/bash
set -e
cd "$(dirname "$0")"

PYTHON=/home/runner/workspace/.pythonlibs/bin/python3

$PYTHON -m pip install -r requirements.txt -q

export PYTHONPATH="$(pwd):$PYTHONPATH"
exec $PYTHON main.py
