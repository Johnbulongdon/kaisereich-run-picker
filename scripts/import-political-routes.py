"""Import active political game-rule options from the pinned official source.

Usage: python scripts/import-political-routes.py /path/to/Kaiserreich-HOI4
Keeps existing IDs (and therefore saves). Does not enumerate focus-tree paths
that have no game rule. Foreign-policy, war-plan and random options are excluded.
"""
import importlib
import json
import re
import sys
from pathlib import Path

parse = importlib.import_module('audit-starting-roster').parse
root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
target = root / 'data/paths.json'
data = json.loads(target.read_text(encoding='utf-8'))
loc = dict(re.findall(r'^\s*(\w+):\s*"(.*)"\s*$', (source / 'localisation/english/KR_common/Game Rules l_english.yml').read_text(encoding='utf-8-sig'), re.M))

def resolve(key):
    value = loc.get(key, key)
    for _ in range(15):
        new = re.sub(r'\$(\w+)\$', lambda m: loc.get(m[1], m[0]), value)
        if new == value:
            break
        value = new
    return value

def clean(value):
    value = re.sub(r'£[\w]+', '', value)
    value = re.sub(r'§.', '', value).replace('\\n', '\n').replace('\\"', '"')
    return re.sub(r'[ \t]+', ' ', value).strip()

codes = dict(zip(['TOTALIST','SYNDIE','RADSOC','SOCDEM','SOCLIB','MARLIB','SOCCON','AUTDEM','PATAUT','NATPOP'],
                ['Totalist','Syndicalist','Radical Socialist','Social Democrat','Social Liberal','Market Liberal','Social Conservative','Authoritarian Democrat','Paternal Autocrat','National Populist']))
colors = dict(zip('tsrSlmcaPn', ['Totalist','Syndicalist','Radical Socialist','Social Democrat','Social Liberal','Market Liberal','Social Conservative','Authoritarian Democrat','Paternal Autocrat','National Populist']))
# These groups describe domestic political outcomes despite lacking _path.
extra = {'USA_election', 'USA_macarthur_path', 'POL_election', 'POL_revolts', 'AUS_election', 'AUS_ausgleich', 'GRE_election', 'GRE_referendum', 'IRE_election', 'SIA_constitution', 'SIA_civil_war', 'SIA_election', 'NFA_election', 'CAN_king', 'CAN_referendum', 'USA_civil_war', 'HAW_strike', 'MEX_revolt', 'PUE_election', 'NIR_revolt', 'RUS_aftermath', 'BAT_collapse', 'JBS_emir', 'JBS_unification', 'SAU_path', 'ASY_revolt', 'LBA_unification', 'INC_revolt', 'INS_revolt', 'NZL_succession', 'CHA_revolt', 'NGR_revolt', 'VOL_revolt', 'MLI_revolt', 'GNA_revolt', 'MRT_revolt', 'TUN_revolt', 'IVO_revolt'}
by_tag = {c['tag']: c for c in data['countries']}
groups = []
excluded = []
unresolved = []
for group, pairs in parse((source / 'common/game_rules/game_rules_country_paths.txt').read_text(encoding='utf-8-sig')):
    tag = group.split('_')[0]
    if tag == 'OTT':
        tag = 'TUR'
    if tag not in by_tag or not (group.lower().endswith('_path') or group in extra):
        excluded.append({'group':group,'reason':'No mapped campaign country' if tag not in by_tag else 'Diplomacy, war setup, cosmetic or non-political setting; not counted as a political route'})
        continue
    country = by_tag[tag]
    title = clean(resolve(dict(pairs)['name']))
    keys = []
    for kind, values in pairs:
        if kind != 'option':
            continue
        option = dict(values)
        key = option['text']
        raw = resolve(option['desc'])
        name = clean(resolve(key))
        description = clean(raw)
        if '$' in description or description == option['desc'] or name == key:
            unresolved.append(key)
            continue
        keys.append(key)
        existing = next((p for p in country['paths'] if p.get('sourceKey') == key), None)
        # A key's single ideology is stronger evidence than introductory prose.
        ideologies = list(dict.fromkeys(codes[c] for c in key.split('_') if c in codes))
        if not ideologies:
            ideologies = list(dict.fromkeys(colors[c] for c in re.findall(r'§([tsrSlmcaPn])', raw)))
        ideology = ideologies[0] if len(ideologies) == 1 else 'Varies by branch'
        path = existing or {'id': key.removeprefix('RULE_OPTION_'), 'name': name, 'shortName': name, 'ideology': ideology}
        if not existing or existing.get('sourceStatus'):
            path['ideology'] = ideology
        path.update(sourceKey=key, ruleGroup=group, ruleGroupName=title,
                    category=title, notes=description, source=data['metadata']['source'],
                    sourceStatus='Official game-rule option; not playtested', routeKind='game-rule',
                    objectives=[f'Follow the {name} political outcome. Consult the route conditions above before starting.'])
        if not existing:
            country['paths'].append(path)
    groups.append({'group': group, 'country': tag, 'sourceKeys': keys})

if unresolved:
    raise ValueError(f'Unresolved source text: {unresolved}')
for country in data['countries']:
    country['pathCoverage'] = 'partial' if country['paths'] else 'pending'
    country['contentStatus'] = 'Political game-rule options imported; focus-tree coverage incomplete' if country['paths'] else 'No imported political game-rule options'
data['metadata'].update(kaiserreichVersion='1.6.4 — political game-rule collection', notes='109 starting nations. Active domestic political game-rule options are imported from the pinned official source. Random choices, foreign policy and war plans are excluded. Independent rule groups are alternatives, not a fabricated cross-product. Options can be conditional; read their descriptions. Focus-tree-only routes and successor-country rules are not comprehensively covered.')
target.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(root / 'data/political-rule-coverage.json').write_text(json.dumps({'upstreamCommit':data['metadata']['upstreamCommit'], 'groups':groups,'excludedGroups':excluded}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'routes':sum(len(c['paths']) for c in data['countries']), 'countriesWithRoutes':sum(bool(c['paths']) for c in data['countries']), 'groups':len(groups)}))
