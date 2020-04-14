import registerLoaders from './registerLoaders';

let cornerstone;
let cornerstoneMath;
let cornerstoneTools;

export default {
    set cornerstone(cs) {
        cornerstone = cs;
        registerLoaders(cornerstone);
    },
    get cornerstone() {
        return cornerstone;
    },
    set cornerstoneMath(cm) {
        cornerstoneMath = cm;
    },
    get cornerstoneMath() {
        return cornerstoneMath;
    },
    set cornerstoneTools(ct) {
        cornerstoneTools = ct;
    },
    get cornerstoneTools() {
        return cornerstoneTools;
    },
};
