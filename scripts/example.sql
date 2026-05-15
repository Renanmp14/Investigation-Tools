-- Investigation Tools - Example Queries (PostgreSQL)

-- workflowdatastudio: search by workflow content
SELECT wds.workflowdatastudioid, ws.name, wds.workflow
FROM public.workflowdatastudio wds
LEFT JOIN public.workflowstudio ws ON wds.workflowstudioid = ws.workflowstudioid
WHERE wds.workflow::text ILIKE '%search_term%'
ORDER BY ws.name NULLS LAST
LIMIT 50;

-- workflowdatastudio: search in nodes or edges
SELECT wds.workflowdatastudioid, ws.name, wds.nodes, wds.edges
FROM public.workflowdatastudio wds
LEFT JOIN public.workflowstudio ws ON wds.workflowstudioid = ws.workflowstudioid
WHERE wds.nodes::text ILIKE '%search_term%'
   OR wds.edges::text ILIKE '%search_term%'
LIMIT 50;

-- actionsstudio: search precommand and poscommand
SELECT name, caption, type, precommand, poscommand
FROM public.actionsstudio
WHERE precommand::text ILIKE '%search_term%'
   OR poscommand::text ILIKE '%search_term%'
ORDER BY name
LIMIT 50;

-- formstudio: search precommand and poscommand
SELECT name, caption, type, precommand, poscommand
FROM public.formstudio
WHERE precommand::text ILIKE '%search_term%'
   OR poscommand::text ILIKE '%search_term%'
ORDER BY name
LIMIT 50;

-- liststudio: search filter and posfilter
SELECT name, caption, filter, posfilter
FROM public.liststudio
WHERE filter::text ILIKE '%search_term%'
   OR posfilter::text ILIKE '%search_term%'
ORDER BY name
LIMIT 50;
