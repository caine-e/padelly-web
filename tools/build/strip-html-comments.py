#!/usr/bin/env python3
"""Remove HTML comments from built pages without rewriting their markup."""
from html.parser import HTMLParser
from pathlib import Path
import sys


class CommentSpans(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.spans = []
        self.raw_tag = None

    def handle_starttag(self, tag, attrs):
        if not self.raw_tag and tag in {
            'script', 'style', 'textarea', 'title', 'xmp', 'iframe',
            'noembed', 'noframes', 'plaintext',
        }:
            self.raw_tag = tag

    def handle_endtag(self, tag):
        if tag == self.raw_tag:
            self.raw_tag = None

    def handle_comment(self, data):
        if self.raw_tag:
            return
        line, column = self.getpos()
        start = self.offsets[line - 1] + column
        if not self.source.startswith('<!--', start):
            return
        end = self.source.find('-->', start + 4)
        if end == -1:
            raise ValueError('Unterminated HTML comment')
        self.spans.append((start, end + 3))


def strip_comments(source: str) -> str:
    parser = CommentSpans(source)
    parser.feed(source)
    parser.close()
    end = 0
    parts = []
    for start, stop in parser.spans:
        parts.append(source[end:start])
        end = stop
    parts.append(source[end:])
    return ''.join(parts)


def main():
    directory = Path(sys.argv[1])
    count = 0
    for path in sorted(directory.rglob('*.html')):
        source = path.read_text(encoding='utf-8')
        cleaned = strip_comments(source)
        if cleaned != source:
            path.write_text(cleaned, encoding='utf-8')
            count += 1
    print(f'HTML cleanup: {count} pages cleaned')


if __name__ == '__main__':
    main()
