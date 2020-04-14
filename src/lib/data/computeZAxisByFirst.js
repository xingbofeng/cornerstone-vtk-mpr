import mean from '../math/mean.js';
import diff from '../math/diff.js';

// Given the orientation, determine the coordinates of the z axis
// i.e. the z axis per the DICOM xray or other device relative to the
// patient. Also, determine the average spacing along that axis, and
// return the index (0,1,2) of the z axis.
export default function (orientation, firstImageMetaData, size) {
    var ippArray = []
    const xyzIndex = determineOrientationIndex(orientation)

    let ipp = firstImageMetaData.imagePositionPatient

    for (let i = 0; i < size; i++) {
        if (xyzIndex === 0) {
            ippArray.push((ipp.x || ipp[0]) + imagePlaneModule.columnPixelSpacing * i)
        } else if (xyzIndex === 1) {
            ippArray.push((ipp.y || ipp[1]) + imagePlaneModule.rowPixelSpacing * i)
        } else {
            ippArray.push((ipp.z || ipp[2]) - firstImageMetaData.sliceThickness * i)
        }
    }

    ippArray.sort(function (a, b) {
        return a - b
    })


    var obj = {
        spacing: firstImageMetaData.sliceThickness,
        positions: ippArray,
        origin: [ipp[0], ipp[1], ippArray[0]],
        xyzIndex
    }
    return obj
}

// given the text orientation, determine the index (0,1,2)
// of the z axis
function determineOrientationIndex(orientation) {
    var o = orientation
    var index
    switch (o) {
        case 'A':
        case 'P':
            index = 1
            break;
        case 'L':
        case 'R':
            index = 0
            break;
        case 'S':
        case 'I':
            index = 2
            break;
        default:
            console.assert(false, ' OBLIQUE NOT SUPPORTED')
            break;
    }
    return index
}
