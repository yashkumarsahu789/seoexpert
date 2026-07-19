// n8n Code — set pillar for next check node
const ctx = $input.first().json;
return [{ json: { ...ctx, _checkPillar: 'aeo' } }];
