"""Build pinned ideology flags and unambiguous direct path cosmetic overrides.
Usage: python scripts/import-flag-variants.py <upstream> <flag-tree.json>
The tree JSON must list path and sha entries from the pinned upstream commit.
"""
import importlib,json,re,sys,urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parents[1];src=Path(sys.argv[1]);tree={x['path']:x for x in json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))}
sys.path.insert(0,str(root/'scripts'));parse=importlib.import_module('audit-starting-roster').parse
data=json.loads((root/'data/paths.json').read_text(encoding='utf-8'))
codes={name:name.lower().replace(' ','_') for name in data['ideologies']}
manifest={'upstreamCommit':data['metadata']['upstreamCommit'],'method':'Exact official ideology filename matches, plus unconditional same-country cosmetic-tag effects for individual source outcomes. Conditional or unresolved cosmetic changes retain the ideology or country fallback. These are reference flags, not a simulation of campaign state.','countries':{},'paths':{},'assets':{}}
def asset(path):
 item=tree.get(path)
 if not item:return None
 local='./assets/flags/variants/'+item['sha']+'.png'
 manifest['assets'][local]={'source':path,'sha':item['sha']}
 return local
def flag(prefix,code):
 return asset('gfx/flags/'+prefix+'_'+code+'.tga')
effects={}
for file in sorted((src/'common/scripted_effects').glob('*.txt')):effects.update(parse(file.read_text(encoding='utf-8-sig')))
def cosmetic(pairs,visited=()):
 found=[]
 for k,v in pairs:
  if k=='set_cosmetic_tag' and isinstance(v,str):found.append(v)
  elif k=='ROOT' and isinstance(v,list):found+=cosmetic(v,visited)
  elif k in effects and isinstance(effects[k],list) and k not in visited and len(visited)<10:found+=cosmetic(effects[k],visited+(k,))
 return found
cache={}
def units(pairs):
 for k,v in pairs:
  if not isinstance(v,list):continue
  if k in ('country_event','focus','shared_focus'):yield k,v
  else:yield from units(v)
for c in data['countries']:
 stem=Path(c['flagSource']).stem
 for code in codes.values():
  if stem.endswith('_'+code):stem=stem[:-len(code)-1];break
 # Preserve distinct successor identities instead of borrowing their parent's variants.
 base={'CAN':'CAN','GBR':'GBR','SWF':'SPA_syndicalist','SPR':'SPA_carlists','NAT':'SAF_natal'}.get(c['tag'],c.get('sourceTag',c['tag']))
 mapping={}
 for ideology in sorted({p['ideology'] for p in c['paths']}):
  if ideology not in codes:continue
  match=flag(stem,codes[ideology]) or flag(base,codes[ideology])
  if match:mapping[ideology]=match
 if mapping:manifest['countries'][c['tag']]=mapping
 for p in c['paths']:
  if p.get('routeKind') not in ('event-choice','focus-branch'):continue
  relative=urllib.parse.unquote(p['source'].split('/'+manifest['upstreamCommit']+'/')[-1])
  file=src/relative
  if not file.is_file():continue
  if relative not in cache:cache[relative]=list(units(parse(file.read_text(encoding='utf-8-sig'))))
  uid,option=p['sourceKey'].split(':',1)
  for kind,body in cache[relative]:
   if str(dict(body).get('id'))!=uid:continue
   if kind=='country_event':
    choices=[v for k,v in body if k=='option' and isinstance(v,list) and dict(v).get('name')==option]
    if len(choices)!=1:continue
    tags=cosmetic(choices[0])
   else:tags=cosmetic(dict(body).get('completion_reward',[]))
   if len(set(tags))!=1:continue
   prefix=tags[0]
   target=(flag(prefix,codes[p['ideology']]) if p['ideology'] in codes else None) or asset('gfx/flags/'+prefix+'.tga')
   if target:manifest['paths'][p['id']]={'flag':target,'effectSource':p['source'],'cosmeticTag':prefix}
(root/'data/flag-variants.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'countries':len(manifest['countries']),'ideologyMappings':sum(map(len,manifest['countries'].values())),'pathOverrides':len(manifest['paths']),'assets':len(manifest['assets'])}))
