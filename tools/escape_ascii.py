#!/usr/bin/env python3
"""Convert every non-ASCII character in js/*.js to \\uXXXX escapes.

Run from the project root:  python3 tools/escape_ascii.py
Keeps sources pure ASCII so the GitHub push API (argv transport) cannot
corrupt Bengali text. Idempotent: already-escaped sequences are plain
ASCII backslash-u text and are left alone.
"""
import glob
import sys

def escape_file(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    out = []
    for ch in text:
        if ord(ch) > 127:
            out.append('\\u%04x' % ord(ch))
        else:
            out.append(ch)
    new = ''.join(out)
    if new != text:
        with open(path, 'w', encoding='ascii') as f:
            f.write(new)
        return True
    return False

if __name__ == '__main__':
    changed = [p for p in sorted(glob.glob('js/*.js') + glob.glob('tests/*.js') + glob.glob('tests/*.mjs')) if escape_file(p)]
    print('escaped: %s' % (', '.join(changed) if changed else 'none (already ASCII)'))
    sys.exit(0)
