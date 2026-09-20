"""Catalogue visible political event choices and focus outcomes from local source.

This is a reference catalogue, not a reachability proof. Imported branches are
labelled separately from game rules; repeat election events are not unique trees.
Only changes to the file's own country are used. Dynamic/foreign scopes and
unresolved localization are recorded in the audit instead of guessed.
"""
import importlib,json,re,sys,urllib.parse
from pathlib import Path
parse=importlib.import_module('audit-starting-roster').parse
src=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
inputs=json.loads((root/'data/source-inputs.json').read_text(encoding='utf-8'))
missing=[item['path'] for item in inputs['files'] if not (src/item['path']).is_file()]
if missing:raise SystemExit('Missing source inputs; refusing to replace catalogue: '+', '.join(missing))
data=json.loads((root/'data/paths.json').read_text(encoding='utf-8'))
countries={c['tag']:c for c in data['countries']}
aliases={'NPA':('National Protection Alliance leader','GXC SZC HNN YUN'),'NZH':('Northern Zhili leader','QIE ANQ HNN SZC KUM'),'SZH':('Southern Zhili leader','LEP GXC YUN'),'MCU':('Manchu loyalist leader','QIE SHD KUM'),'AGJ':('Anguojun leader','FNG SHD ANQ GXC'),'UPC':('United Provinces of China leader','GXC YUN SZC HNN'),'LKT':('Left Kuomintang leader','CHI GXC YUN HNN'),'RKT':('Right Kuomintang leader','GXC YUN HNN'),'RGC':('GEACPS-aligned Chinese leader','FNG'),'SPK':('Alfonsist Spain','SPA'),'ZAR':('non-socialist South Africa','SAF'),'OTT':('Ottoman government','TUR'),'RIG':('Riga government','BAT'),'WHR':('White Ruthenian government','BLR')}
loc={}
for file in sorted((src/'localisation/english').rglob('*.yml')):
 loc.update(re.findall(r'^\s*([\w.\-]+):\d*\s*"(.*)"\s*(?:#.*)?$',file.read_text(encoding='utf-8-sig'),re.M))
dynamic={}
for file in sorted((src/'common/scripted_localisation').glob('*.txt')):
 for k,v in parse(file.read_text(encoding='utf-8-sig')):
  if k=='defined_text' and isinstance(v,list):
   dynamic[dict(v).get('name')]=list(dict.fromkeys(dict(x).get('localization_key') for key,x in v if key=='text' and isinstance(x,list)))
current_display_tag=''
def localized(key):
 return loc.get(str(key).strip('"').replace('[ROOT.GetTag]',current_display_tag),'')
def clean(key):
 if isinstance(key,list):return ' / '.join(dict.fromkeys(filter(None,(clean(v) for k,v in key if k=='text'))))
 if not isinstance(key,str):return ''
 value=localized(key)
 for _ in range(20):
  new=re.sub(r'\$([\w.\-]+)\$',lambda m:loc.get(m[1],m[0]),value)
  new=re.sub(r'\[(\w+)\]',lambda m:' / '.join(dict.fromkeys(localized(x) for x in dynamic[m[1]] if localized(x))) if m[1] in dynamic and any(localized(x) for x in dynamic[m[1]]) else m[0],new)
  if new==value:break
  value=new
 value=re.sub(r'§.|£[\w]+','',value).replace('\\n','\n').replace('\\"','"')
 value=re.sub(r'\[getyear\]','',value,flags=re.I).replace('[GetDateText]','the scheduled date')
 value=re.sub(r'\[GetMonth\]','',value)
 value=re.sub(r'\[(?:Root|ROOT|[A-Z]{3})\.Get(?:Proper|NonIdeology)?Adjective\]','',value)
 value=re.sub(r'\[(?:Root|ROOT)\.GetNameDef\]','the country',value)
 value=re.sub(r'\[(?:Root|ROOT|[A-Z]{3})\.GetLeader\]','The Leader',value)
 value=value.replace('[GetSecondInCommand]','the Head of Government').replace('[POL.GetKingdomOrRepublicCap]','State')
 value=value.replace('[879.GetCapitalVictoryPointName]','the capital').replace('[FROM.GetAdjective]','Foreign')
 value=value.replace('[?FRA_jacobin_leader.GetName]','The New Jacobin Leader').replace('[QIE.GetNameDef]','the Beijing government')
 value=value.replace('[FROM.Capital.GetCapitalVictoryPointName]','The Other Government').replace('[UPC.Capital.GetCapitalVictoryPointName]','The Federal Government').replace('[HND.Capital.GetCapitalVictoryPointName]','Indian')
 value=value.replace('[OTT_GetSultanCommonName]','').replace('[UPC_GetSTAPartyLeader]','The Party Leader')
 value=value.replace('[FROM.GetFactionName]','Faction Leader').replace('[From.GetFactionName]','the target faction').replace('[INT.GetName]','Internationale Leader')
 value=re.sub(r'\[[A-Z]{3}_(totalist|syndicalist|radical_socialist|social_democrat|social_liberal|market_liberal|social_conservative|authoritarian_democrat|paternal_autocrat|national_populist)_party_name\]',lambda m:m[1].replace('_',' ').title()+' party',value)
 value=re.sub(r'[ \t]+',' ',value)
 if re.search(r'\$[\w.\-]+\$|\[[^\]]+\]',value):return ''
 return value.strip()
ideologies={'totalist':'Totalist','syndicalist':'Syndicalist','radical_socialist':'Radical Socialist','social_democrat':'Social Democrat','social_liberal':'Social Liberal','market_liberal':'Market Liberal','social_conservative':'Social Conservative','authoritarian_democrat':'Authoritarian Democrat','paternal_autocrat':'Paternal Autocrat','national_populist':'National Populist'}
effects={}
for file in sorted((src/'common/scripted_effects').glob('*.txt')):
 effects.update(parse(file.read_text(encoding='utf-8-sig')))
skip={'trigger','limit','ai_chance','ai_will_do','available','bypass','cancel_if_invalid','prerequisite','mutually_exclusive','modifier','random_country','every_country','any_country','ROOT','FROM','PREV','owner','controller','overlord','event_target','original_tag'}
def changes(pairs,tag,visited=()):
 result=[]
 for key,value in pairs:
  if (key in skip and key!='ROOT') or ':' in key or (re.fullmatch(r'[A-Z0-9]{3}',key) and key!=tag and not (key in aliases and tag in aliases[key][1].split())):continue
  if key=='set_politics' and isinstance(value,list):
   party=dict(value).get('ruling_party')
   if party in ideologies:result.append(ideologies[party])
  elif key in ('promote_character','add_country_leader_role','create_country_leader'):
   role=dict(value).get('ideology','') if isinstance(value,list) else value
   result.append(next((name for code,name in ideologies.items() if str(role).startswith(code)), 'Varies by branch'))
  elif (key.startswith(('every_','random_','any_')) and key!='random_list') or key in ('effect_tooltip','owner','controller','capital_scope','overlord'):continue
  elif key in effects and isinstance(effects[key],list) and key not in visited and len(visited)<12:
   result.extend(changes(effects[key],tag,visited+(key,)))
  elif isinstance(value,list):result.extend(changes(value,tag,visited))
 return list(dict.fromkeys(result))
def descendants(pairs):
 for k,v in pairs:
  yield k,v
  if isinstance(v,list):yield from descendants(v)
audit={'upstreamCommit':data['metadata']['upstreamCommit'],'method':'Static scan of visible event choices and focus rewards for direct or scripted changes of ruling party or country leader. Event ownership is traced from positive tag triggers and country-scoped call sites, never from event filenames. Dynamic scopes, hidden events and unresolved text are excluded. This does not prove in-game reachability or exhaustive route equivalence.','files':[],'unresolved':[],'unknownCountries':[],'unresolvedRecipients':[],'imported':[]}
parsed_files={file:parse(file.read_text(encoding='utf-8-sig')) for folder in ('common/national_focus','events','history/countries','common/on_actions','common/decisions') for file in sorted((src/folder).glob('*.txt'))}
shared={dict(v)['id']:v for file,parsed in parsed_files.items() if file.parent.name=='national_focus' for k,v in descendants(parsed) if k=='shared_focus' and isinstance(v,list) and 'id' in dict(v)}
shared_owners={key:set() for key in shared}
for file,parsed in parsed_files.items():
 if file.parent.name!='national_focus':continue
 match=re.match(r'([A-Z]{3})\b',file.name)
 if not match or match[1] not in countries:continue
 tag=match[1]
 selected={v for k,v in descendants(parsed) if k=='shared_focus' and isinstance(v,str) and v in shared}
 while True:
  before=len(selected)
  for key,value in shared.items():
   if any(dict(v).get('focus') in selected for k,v in value if k=='prerequisite' and isinstance(v,list)):selected.add(key)
  if before==len(selected):break
 for key in selected:shared_owners[key].add(tag)
events={}
decisions={k:v for file,parsed in parsed_files.items() if file.parent.name=='decisions' for k,v in descendants(parsed) if isinstance(v,list) and ('complete_effect' in dict(v) or 'remove_effect' in dict(v))}
receivers={}
event_contexts={}
explicit_receivers={}
def positive_tags(pairs):
 result=set()
 for k,v in pairs:
  if k in ('tag','original_tag') and isinstance(v,str) and re.fullmatch(r'[A-Z]{3}',v):result.add(v)
  elif k=='has_completed_focus' and isinstance(v,str) and v.split('_')[0] in countries:result.add(v.split('_')[0])
  elif k in ('OR','AND') and isinstance(v,list):result.update(positive_tags(v))
 return result
for file,parsed in parsed_files.items():
 if file.parent.name!='events':continue
 for k,v in parsed:
  if k=='country_event' and isinstance(v,list) and 'id' in dict(v):
   ev=dict(v);events[ev['id']]=v;receivers[ev['id']]=positive_tags(ev.get('trigger',[]))
   event_contexts[ev['id']]={(tag,None) for tag in receivers[ev['id']]}
   explicit_receivers[ev['id']]=set(receivers[ev['id']])
def calls(pairs,scope,visited=(),root_scope=None,event_from=None,explicit=False):
 if root_scope is None:root_scope=scope
 for k,v in pairs:
  if k in ('trigger','limit','ai_chance','ai_will_do','available','bypass'):continue
  if k in ('country_event','news_event'):
   event=dict(v).get('id') if isinstance(v,list) else v
   if event in receivers and scope:
    receivers[event].add(scope);event_contexts[event].add((scope,root_scope))
    if explicit:explicit_receivers[event].add(scope)
  elif k=='activate_targeted_decision' and isinstance(v,list):
   decision=dict(v).get('decision');target=dict(v).get('target')
   if decision in decisions and decision not in visited and isinstance(target,str) and re.fullmatch(r'[A-Z]{3}',target):yield from calls(decisions[decision],scope,visited+(decision,),root_scope,target,explicit)
  elif k=='ROOT' and isinstance(v,list):yield from calls(v,root_scope,visited,root_scope,event_from,explicit)
  elif k=='FROM' and isinstance(v,list):yield from calls(v,event_from,visited,root_scope,event_from,False)
  elif re.fullmatch(r'[A-Z]{3}',k) and isinstance(v,list):yield from calls(v,k,visited,root_scope,event_from,True)
  elif k in ('if','else_if','every_country','every_other_country','random_country') and isinstance(v,list):
   tags=positive_tags(dict(v).get('limit',[]))
   if not tags and (scope is None or k in ('every_country','every_other_country','random_country')):
    tags={flag.split('_')[0] for field,flag in dict(v).get('limit',[]) if field=='has_country_flag' and isinstance(flag,str) and flag.split('_')[0] in countries}
   if tags:
    for target in tags:yield from calls(v,target,visited,root_scope,event_from,explicit)
   elif k in ('if','else_if'):yield from calls(v,scope,visited,root_scope,event_from,explicit)
  elif k in skip or ':' in k or (k.startswith(('every_','random_','any_')) and k!='random_list') or k in ('effect_tooltip','capital_scope'):continue
  elif k in effects and isinstance(effects[k],list) and k not in visited and len(visited)<12:yield from calls(effects[k],scope,visited+(k,),root_scope,event_from,explicit)
  elif isinstance(v,list):yield from calls(v,scope,visited,root_scope,event_from,explicit)
 yield None
for file,parsed in parsed_files.items():
 if file.parent.name=='events':continue
 match=re.match(r'([A-Z]{3})\b',file.name)
 if file.parent.name=='on_actions':list(calls(parsed,None))
 elif match:list(calls(parsed,match[1]))
 if file.parent.name=='decisions' and match:
  for key,value in descendants(parsed):
   if not isinstance(value,list):continue
   for target_kind,target in dict(value).get('targets',[]):
    if target_kind=='$value' and re.fullmatch(r'[A-Z]{3}',target):list(calls(value,match[1],event_from=target))
for key,owners in shared_owners.items():
 for tag in owners:list(calls(shared[key],tag))
for _ in range(30):
 before=sum(map(len,event_contexts.values()))
 for uid,unit in events.items():
  for tag,sender in list(event_contexts[uid]):list(calls(unit,tag,event_from=sender))
 if before==sum(map(len,event_contexts.values())):break
seen={}
for country in countries.values():
 country['paths']=[p for p in country['paths'] if p.get('routeKind') not in ('event-choice','focus-branch','decision-branch')]
for folder in ('common/national_focus','events','common/decisions'):
 for file in sorted((src/folder).glob('*.txt')):
  rel=file.relative_to(src).as_posix();audit['files'].append(rel)
  match=re.match(r'([A-Z]{3})\b',file.name)
  if not match:continue
  tag=match[1]
  parsed=parsed_files[file]
  if folder=='events':
   units=[]
   for k,v in parsed:
    if k!='country_event' or not isinstance(v,list) or dict(v).get('hidden')=='yes':continue
    uid=dict(v).get('id');targets=receivers.get(uid,set())
    if not targets and changes(v,tag):audit['unresolvedRecipients'].append({'file':rel,'id':uid})
    for recipient in sorted(targets,key=lambda target:(target in aliases,target)):
     mapped_tags=aliases[recipient][1].split() if recipient in aliases else ['GBR' if tag=='GBR' and recipient=='IMP' else 'CAN' if recipient=='IMP' else recipient]
     # Cross-country notifications need individual review: a reachable call can
     # still fail a runtime flag condition. Do not turn them into host routes.
     for mapped in mapped_tags:
      if mapped!=tag and tag!=recipient and not (tag=='NEE' and mapped=='ACC') and recipient not in explicit_receivers.get(uid,set()):continue
      if mapped not in countries:
       audit['unknownCountries'].append(mapped);continue
      condition=aliases[recipient][0] if recipient in aliases else ''
      units.append((mapped,k,v+([('catalogue_role',condition)] if condition else [])))
  elif folder=='common/decisions':
   units=[(tag,'decision',[('id',k)]+v) for k,v in descendants(parsed) if isinstance(v,list) and 'complete_effect' in dict(v) and tag in countries and k.startswith(tag+'_')]
  else:
   units=[]
   for k,v in descendants(parsed):
    if k not in ('focus','shared_focus') or not isinstance(v,list):continue
    targets=shared_owners.get(dict(v).get('id'),set()) if k=='shared_focus' else {tag}
    for target in sorted(targets):
     if target in countries:units.append((target,k,v))
     elif changes(v,target):audit['unknownCountries'].append(target)
  for tag,kind,unit in units:
   current_display_tag=tag
   d=dict(unit);uid=d.get('id')
   if not uid:continue
   def field_text(field,fallback):
    variants=[]
    for k,v in unit:
     if k!=field:continue
     if isinstance(v,list):
      tags=positive_tags(dict(v).get('trigger',[]))
      if tags and tag not in tags:continue
     text=clean(v)
     if text:variants.append(text)
    return ' / '.join(dict.fromkeys(variants)) or clean(fallback)
   title=field_text('title',d.get('name',uid)); description=field_text('desc',uid+'_desc')
   choices=[(i,dict(v)) for i,(k,v) in enumerate(unit) if k=='option' and isinstance(v,list)] if kind=='country_event' else [(0,{'name':uid,'reward':d.get('complete_effect' if kind=='decision' else 'completion_reward',[])})]
   for index,choice in choices:
    option_tags=positive_tags(choice.get('trigger',[]))
    if option_tags and tag not in option_tags and not (tag=='CAN' and 'IMP' in option_tags):continue
    body=unit[index][1] if kind=='country_event' else choice['reward']
    if not isinstance(body,list):continue
    political=changes(body,tag)
    if not political and kind=='country_event' and len(choices)==1:political=changes(d.get('immediate',[]),tag)
    if not political:continue
    name=title if kind=='decision' else clean(choice.get('name',''))
    if not title or not name:
     audit['unresolved'].append({'file':rel,'id':uid,'option':choice.get('name'),'reason':'Missing or dynamic display text'});continue
    ideology=political[0] if len(political)==1 else 'Varies by branch'
    key=(tag,title,name,ideology,kind)
    source='https://github.com/Kaiserreich/Kaiserreich-HOI4/blob/'+data['metadata']['upstreamCommit']+'/'+urllib.parse.quote(rel)
    if key in seen:
     seen[key].setdefault('additionalSourceKeys',[]).append(uid+':'+str(choice['name']));continue
    pid=re.sub(r'[^A-Z0-9_]','_',f'{tag}_{kind}_{uid}_{choice["name"]}_{index}'.upper())
    path={'id':pid,'name':f'{title} — {name}' if name!=title else title,'shortName':name,'ideology':ideology,'category':'Political event choice' if kind=='country_event' else 'Political focus outcome','routeKind':'event-choice' if kind=='country_event' else 'focus-branch','sourceKey':uid+':'+str(choice['name']),'source':source,'sourceStatus':'Source-defined political outcome; availability not playtested','ruleGroupName':'Conditional political event' if kind=='country_event' else 'Political focus branch'}
    if kind=='country_event':
     instruction=f'When “{title}” becomes available, choose “{name}”. This may be a later election or an alternative within a broader political route.'
    else:
     prerequisites=[clean(dict(v).get('focus')) for k,v in unit if k=='prerequisite' and isinstance(v,list)]
     instruction=f'Complete “{title}” when its branch is unlocked in-game.'
     if any(prerequisites):instruction+=' Preceding focuses: '+', '.join(filter(None,prerequisites))+'.'
    if kind=='decision':
     instruction=f'Complete the decision “{title}” when it is available. Its political outcome depends on the campaign conditions.'
     path.update(category='Political decision outcome',routeKind='decision-branch',ruleGroupName='Conditional political decision')
    if d.get('catalogue_role'):
     instruction='Requires your country to be the '+d['catalogue_role']+'. '+instruction
     path['requiredRole']=d['catalogue_role']
    path.update(notes=instruction+('\n\n'+description if description else ''),objectives=[instruction])
    countries[tag]['paths'].append(path);seen[key]=path
    audit['imported'].append({'id':pid,'country':tag,'file':rel,'sourceKey':path['sourceKey']})
audit['unknownCountries']=sorted(set(audit['unknownCountries']))
for country in countries.values():country['pathCoverage']='partial' if country['paths'] else 'pending'
data['metadata']['sourceBranchAuditComplete']=False
(root/'data/paths.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'data/source-branch-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceFiles':len(audit['files']),'added':len(audit['imported']),'unresolved':len(audit['unresolved']),'unknownCountries':audit['unknownCountries']}))
