import external from './../externalModules.js';

export default async function(metadataModule, imageId){
    let imageMetadata = external.cornerstone.metaData.get(metadataModule, imageId)

    if(!imageMetadata){
        await external.cornerstone.loadAndCacheImage(imageId);
        imageMetadata = external.cornerstone.metaData.get(metadataModule, imageId);
    }

    return imageMetadata;
}