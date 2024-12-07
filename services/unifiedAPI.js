const canvasService = require('./canvasService');
const blackboardService = require('./blackboardService');
const googleClassroomService = require('./googleClassroomService');
const moodleService = require('./moodleService');

const LMS_SERVICES = {
    canvas: canvasService,
    blackboard: blackboardService,
    googleClassroom: googleClassroomService,
    moodle: moodleService,
};

const addCourse = async (lmsName, courseDetails) => {
    const service = LMS_SERVICES[lmsName];
    if (!service) {
        throw new Error(`LMS service for ${lmsName} not implemented.`);
    }

    return await service.addCourse(courseDetails);
};

module.exports = { addCourse };
