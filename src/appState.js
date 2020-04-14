const series = {};
const elementsGroup = {};
const vtkVolumes = {};

export default {
    series,
    vtkVolumes,
    elementsGroup,
    removeVtkVolumes(seriesNumber) {
        delete vtkVolumes[seriesNumber];
    },
    setSeriesElementsGroup(seriesNumber, elements) {
        elementsGroup[seriesNumber] = elements;
    },
    getSeriesElementsGroup(seriesNumber) {
        return elementsGroup[seriesNumber];
    },
    getSeriesElementsGroupByElement(element) {
        for (const seriesNumber in elementsGroup) {
            if (elementsGroup.hasOwnProperty(seriesNumber)) {
                const group = elementsGroup[seriesNumber];
                for (const orientation in group) {
                    if (group.hasOwnProperty(orientation)) {
                        if (element === group[orientation])
                            return group;
                    }
                }
            }
        }
    },
    getSeriesNumberByElement(element) {
        for (const seriesNumber in elementsGroup) {
            if (elementsGroup.hasOwnProperty(seriesNumber)) {
                const group = elementsGroup[seriesNumber];
                for (const orientation in group) {
                    if (group.hasOwnProperty(orientation)) {
                        if (element === group[orientation])
                            return seriesNumber;
                    }
                }
            }
        }
    },
    setSeriesStack(seriesNumber, elements) {
        series[seriesNumber] = elements;
    },
    getSeriesStack(seriesNumber) {
        return series[seriesNumber];
    },
}