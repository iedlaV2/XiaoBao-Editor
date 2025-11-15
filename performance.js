document.addEventListener('DOMContentLoaded', () => {

    const currentSemester = 31627;

    const gpaValueElement = document.getElementById('gpa-value');
    const semesterSelectorElement = document.getElementById('semester-selector');
    const courseListElement = document.getElementById('course-list');

    async function fetchSemesters() {
        const semesterApiUrl = "https://tsinglanstudent.schoolis.cn/api/School/GetSchoolSemesters"; 
        try {
            const response = await fetch(semesterApiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error(`Network response error.`);
            const parsedJson = await response.json();
            return parseSemesterData(parsedJson.data);
        } catch (error) {
            console.error("Error fetching semesters:", error);
            return [];
        }
    }

    async function fetchGPA(semesterId) {
        const gpaApiUrl = 'https://tsinglanstudent.schoolis.cn/api/DynamicScore/GetGpa?semesterId=' + semesterId;
        try {
            const response = await fetch(gpaApiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error(`Network response error.`);
            const parsedJson = await response.json();
            return parsedJson.data;
        } catch (error) {
            console.error("Error fetching GPA:", error);
            return null;
        }

    async function fetchCoursesList() {
        const getcoursesApiUrl = 'https://tsinglanstudent.schoolis.cn/api/LearningTask/GetStuSubjectListForSelect?semesterId=' + semesterId;
        try {
            const response = await fetch(getcoursesApiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error(`Network response error.`);
            const parsedJson = await response.json();
            return parsedJson.data.map(course => ({
            courseName: course.name,
            courseId: course.id
        }));
        } catch (error) {
            console.error("Error fetching Courses:", error);
            return [];
            }        
        }
    
    async function getCourseScore(coursedata) {
        try {
            for (const id of coursedata) {
                const response = await fetch(`https://tsinglanstudent.schoolis.cn/api/DynamicScore/GetDynamicScoreDetail?classId=${id.classId}&subjectId=${id.subjectId}&semesterId=${semesterId}`, { credentials: 'include' });  
                if (!response.ok) throw new Error(`Network response error for subject ${id.courseId}`);
                const parsedJson = await response.json();
                return parsedJson.data;
            }


        } catch (error) {            
            console.error("Error fetching Course Score:", error);
            return [];
        }
    }

    
    async function getClassId(taskId) {
        try {
            const response = await fetch(`https://tsinglanstudent.schoolis.cn/api/LearningTask/GetDetail?learningTaskId=${taskId}`, { credentials: 'include' });
            if (!response.ok) throw new Error(`Network response error.`);
            const parsedJson = await response.json();
            return [parsedJson.data.classId, parsedJson.data.subjectId];
        } catch (error) {
            console.error("Error fetching Class ID:", error);
            return null;
        }
    } 

async function getClassData(subjects) { 
    let classData = [];
    try {
        for (const subject of subjects) {
            const response = await fetch(`https://tsinglanstudent.schoolis.cn/api/LearningTask/GetList?semesterId=${semesterId}&subjectId=${subject.courseId}&typeId=null&mode=null&pageIndex=1&pageSize=100`, { credentials: 'include' });
            if (!response.ok) throw new Error(`Network response error for subject ${subject.courseId}`);
        
            const parsedJson = await response.json();
            const assignmentsForThisSubject = parsedJson.data.list.map(courseData => {
                const taskId = courseData.id;
                const classId = getClassId(taskId);

                return {
                    classId: classId[0],
                    subjectId: classId[1],
                    score: courseData.score || "N/A",
                    type: courseData.typeEName,
                    name: courseData.name 
                };
            });
            classData.push({courseName: subject.courseName, 
                subjectId: assignmentsForThisSubject.subjectId,     
                classId: assignmentsForThisSubject.classId,
                assignments: assignmentsForThisSubject});
        }
        return classData;

    } catch (error) {
        console.error("Error fetching Class Data:", error);
        return [];
    }
}

    async function fetchDashboardData(semesterId, allCourseData) {
        console.log(`Fetching data for semester ID: ${semesterId}`);
        return allCourseData[semesterId] || { gpa: "N/A", courses: [] };
    }

    function parseSemesterData(rawSemesterData) {
        const sortedData = rawSemesterData.sort((a, b) => b.id - a.id);
        return sortedData.map(semester => {
            const academicYear = `${semester.year}-${semester.year + 1}`;
            const displayName = `${academicYear} Semester ${semester.semester}`;
            return { id: semester.id, name: displayName };
        });
    }

    function createCourseCard(course) {
        return `
            <div class="course-card">
                <div class="card-header">
                    <span class="course-name">${course.name}</span>
                    <span class="course-score">${course.score}</span>
                </div>
                <div class="card-details">
                    <span><strong>Grade:</strong> ${course.grade}</span>
                    <span><strong>Grade Point:</strong> ${course.gradePoint}</span>
                </div>
            </div>`;
    }

    function populateSemesterSelector(parsedSemesters) {
        semesterSelectorElement.innerHTML = '';
        parsedSemesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester.id; 
            option.textContent = semester.name; 
            semesterSelectorElement.appendChild(option);
        });
    }
    
    function updateDashboardUI(dashboardData) {
        if (!dashboardData) {
            gpaValueElement.textContent = 'N/A';
            courseListElement.innerHTML = '<p>No data available for this semester.</p>';
            return;
        }

        const gpa = parseFloat(dashboardData.gpa);
        gpaValueElement.textContent = isNaN(gpa) ? 'N/A' : gpa.toFixed(2);

        const maxGpa = 4.3;
        const lightness = 35 + (gpa / maxGpa) * 20;
        const progressColor = `hsl(var(--primary-hue), 85%, ${lightness}%)`;
        gpaValueElement.style.color = progressColor;

        courseListElement.innerHTML = '';
        dashboardData.courses.forEach(course => {
            const cardHTML = createCourseCard(course);
            courseListElement.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    async function initialize() {
        const semesters = await fetchSemesters();
        const gpa = await fetchGPA(semesterId);
        const courseList = await fetchCoursesList(semesterId);
        const courseData = await getClassData(courseList);
        const courseScore = 
        
        if (semesters.length > 0) {
            populateSemesterSelector(semesters);

            const initialSemesterId = semesters[1].id;

            const initialDashboardData = await fetchDashboardData(initialSemesterId, sampleCourseData);
            updateDashboardUI(initialDashboardData);

            semesterSelectorElement.addEventListener('change', async (event) => {
                const selectedSemesterId = event.target.value;

                const dashboardData = await fetchDashboardData(selectedSemesterId, sampleCourseData);
                updateDashboardUI(dashboardData);
            });
            
        } else {
            semesterSelectorElement.innerHTML = '<option>Could not load semesters</option>';
            gpaValueElement.textContent = '---';
            courseListElement.innerHTML = '<p>Could not load semester data. Please check your connection and try again.</p>';
        }
    }

    initialize();
});