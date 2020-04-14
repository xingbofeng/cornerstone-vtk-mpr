import { vec3 } from 'gl-matrix';
import appState from './appState.js';

export default function (seriesNumber) {
    const vtkVolume = appState.vtkVolumes[seriesNumber];
    if (!vtkVolume.vtkImageData) {
        console.error(`series is not enable, please call cornerstoneVtkMpr.enable`);
        return;
    }
    const { vtkImageData } = vtkVolume;
    const [x0, y0, z0] = vtkImageData.getOrigin();
    const [xSpacing, ySpacing, zSpacing] = vtkImageData.getSpacing();
    const [xMin, xMax, yMin, yMax, zMin, zMax] = vtkImageData.getExtent();
    const axialIopAsString = '1,0,0,0,1,0';
    const coronalIopAsString = '1,0,0,0,0,-1';
    const sagittalIopAsString = '0,1,0,0,0,-1';
    const stackUrls = {
        axial: [],
        coronal: [],
        sagittal: [],
    };

    // 从头到脚的顺序是从大到小
    for (let z = zMin; z <= zMax; z++) {
        const imagePosititionPatient = vec3.fromValues(
            x0 + xSpacing * 0.5 * (xMin + xMax),
            y0 + ySpacing * 0.5 * (yMin + yMax),
            z0 + zSpacing * z
        );
        const imageOrientationPatient = axialIopAsString;
        stackUrls.axial.push(`mpr:${seriesNumber}:${imageOrientationPatient}:${imagePosititionPatient.join()}:axial`);
    }
    for (let y = yMin; y <= yMax; y++) {
        const imagePosititionPatient = vec3.fromValues(
            x0 + xSpacing * 0.5 * (xMin + xMax),
            y0 + ySpacing * y,
            z0 + zSpacing * 0.5 * (zMin + zMax)
        );
        const imageOrientationPatient = coronalIopAsString;
        stackUrls.coronal.push(`mpr:${seriesNumber}:${imageOrientationPatient}:${imagePosititionPatient.join()}:coronal`);
    }
    for (let x = xMin; x <= xMax; x++) {
        const imagePosititionPatient = vec3.fromValues(
            x0 + xSpacing * x,
            y0 + ySpacing * 0.5 * (yMin + yMax),
            z0 + zSpacing * 0.5 * (zMin + zMax)
        );
        const imageOrientationPatient = sagittalIopAsString;
        stackUrls.sagittal.push(`mpr:${seriesNumber}:${imageOrientationPatient}:${imagePosititionPatient.join()}:sagittal`);
    }

    return stackUrls;
}