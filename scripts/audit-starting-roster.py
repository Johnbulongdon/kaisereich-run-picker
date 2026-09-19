"""Compare the bundled roster with a local checkout of the pinned mod source.

Usage: python scripts/audit-starting-roster.py /path/to/Kaiserreich-HOI4
No third-party packages or network access required. This audits territorial
starting tags, not the completeness of their political routes.
"""
import json
import re
import sys
from pathlib import Path


def parse(text):
    tokens = re.findall(r'"(?:\\.|[^"\\])*"|#[^\n]*|[{}=]|[^\s{}=#]+', text)
    tokens = [token for token in tokens if not token.startswith('#')]
    index = 0

    def block():
        nonlocal index
        pairs = []
        while index < len(tokens):
            key = tokens[index]
            index += 1
            if key == '}':
                break
            if index < len(tokens) and tokens[index] == '=':
                index += 1
                value = tokens[index]
                index += 1
                pairs.append((key, block() if value == '{' else value))
        return pairs

    return block()


def owners(source):
    result = {}
    files = list((source / 'history/states').glob('*.txt'))
    if not files:
        raise ValueError('No history/states/*.txt files found')
    for file in files:
        state = dict(parse(file.read_text(encoding='utf-8-sig')))['state']
        history = dict(state).get('history', [])
        owner = dict(history).get('owner')
        dated = [(tuple(map(int, key.split('.'))), value) for key, value in history
                 if re.fullmatch(r'\d{4}\.\d{1,2}\.\d{1,2}', key)]
        for date, effects in sorted(dated):
            if date <= (1936, 1, 1):
                owner = dict(effects).get('owner', owner)
        if owner:
            result.setdefault(owner, []).append(file.name)
    return {tag: sorted(states) for tag, states in result.items()}


if __name__ == '__main__':
    source = Path(sys.argv[1])
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'data/starting-roster.json').read_text(encoding='utf-8'))
    expected = {row['sourceTag']: sorted(row['ownedStates']) for row in manifest['countries']}
    actual = owners(source)
    if actual != expected:
        raise SystemExit('Roster mismatch: use the pinned commit ' + manifest['upstreamCommit'] + ' and review changed ownership.')
    print(f'PASS: {len(actual)} starting territorial tags match the complete source ownership manifest.')
