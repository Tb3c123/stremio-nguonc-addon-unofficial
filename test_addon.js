import addonInterface from './src/addon.js';

async function runTests() {
  console.log('--- Testing Catalog (Series) ---');
  const catalogRes = await addonInterface.get('catalog', 'series', 'nguonc_series');
  console.log(`Fetched ${catalogRes.metas.length} series items.`);
  if (catalogRes.metas.length > 0) {
    const sample = catalogRes.metas[0];
    console.log('Sample series item:', sample.name, `(${sample.id})`);

    console.log('\n--- Testing Series Meta ---');
    const metaRes = await addonInterface.get('meta', 'series', sample.id);
    console.log('Meta name:', metaRes.meta?.name);
    console.log('Meta type:', metaRes.meta?.type);
    console.log('Episodes count:', metaRes.meta?.videos?.length || 0);

    if (metaRes.meta?.videos && metaRes.meta.videos.length > 0) {
      const firstEp = metaRes.meta.videos[0];
      console.log('\n--- Testing Series Episode Stream ---');
      console.log('Episode:', firstEp.title, `(${firstEp.id})`);
      const streamRes = await addonInterface.get('stream', 'series', firstEp.id);
      console.log(`Fetched ${streamRes.streams.length} stream sources:`);
      streamRes.streams.forEach((st, i) => {
        const targetLink = st.url || st.externalUrl || '';
        console.log(` Stream #${i + 1}: ${st.name} | ${st.title.replace('\n', ' ')}`);
        console.log(` Link: ${targetLink.substring(0, 80)}...`);
      });
    }
  }

  console.log('\n✅ Series tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
