import mprMetaDataProvider from './lib/mprMetadata/mprMetaDataProvider.js';
import mprImageLoader from './mprImageLoader.js'

function registerLoaders (cornerstone) {
    cornerstone.registerImageLoader('mpr', mprImageLoader);
    cornerstone.metaData.addProvider(mprMetaDataProvider);
}

export default registerLoaders;
