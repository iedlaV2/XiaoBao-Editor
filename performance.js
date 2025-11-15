document.addEventListener('DOMContentLoaded', () => {

    const gradingScale = [
        { "displayName": "A+", "minValue": 97.00, "maxValue": 9999.90, "sort": 0, "gpa": 4.30 },
        { "displayName": "A", "minValue": 93.00, "maxValue": 96.99, "sort": 1, "gpa": 4.00 },
        { "displayName": "A-", "minValue": 90.00, "maxValue": 92.99, "sort": 2, "gpa": 3.70 },
        { "displayName": "B+", "minValue": 87.00, "maxValue": 89.99, "sort": 3, "gpa": 3.30 },
        { "displayName": "B", "minValue": 83.00, "maxValue": 86.99, "sort": 4, "gpa": 3.00 },
        { "displayName": "B-", "minValue": 80.00, "maxValue": 82.99, "sort": 5, "gpa": 2.70 },
        { "displayName": "C+", "minValue": 77.00, "maxValue": 79.99, "sort": 6, "gpa": 2.30 },
        { "displayName": "C", "minValue": 73.00, "maxValue": 76.99, "sort": 7, "gpa": 2.00 },
        { "displayName": "C-", "minValue": 70.00, "maxValue": 72.99, "sort": 8, "gpa": 1.70 },
        { "displayName": "D+", "minValue": 67.00, "maxValue": 69.99, "sort": 9, "gpa": 1.30 }, //SIX SEVEN SIX SEVEN SIX SEVEN SIX SEVEN 
        { "displayName": "D", "minValue": 63.00, "maxValue": 66.99, "sort": 10, "gpa": 1.00 },
        { "displayName": "D-", "minValue": 60.00, "maxValue": 62.99, "sort": 11, "gpa": 0.70 },
        { "displayName": "F", "minValue": 0.00, "maxValue": 59.99, "sort": 12, "gpa": 0.00 }
    ];

    const gpaValueElement = document.getElementById('gpa-value');
    const semesterSelectorElement = document.getElementById('semester-selector');
    const courseListElement = document.getElementById('course-list');

    async function fetchSemesters() {
        const apiUrl = "https://tsinglanstudent.schoolis.cn/api/School/GetSchoolSemesters";
        try {
            const response = await fetch(apiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error("Network response error.");
            const parsedJson = await response.json();
            return parseSemesterData(parsedJson.data);
        } catch (error) {
            console.error("Error fetching semesters:", error);
            return [];
        }
    }

    async function fetchGPA(semesterId) {
        const apiUrl = `https://tsinglanstudent.schoolis.cn/api/DynamicScore/GetGpa?semesterId=${semesterId}`;
        try {
            const response = await fetch(apiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error("Network request failed.");

            const parsedJson = await response.json();
            if (parsedJson.state !== 0) {
                throw new Error(`API returned an error state: ${parsedJson.state}. Message: ${parsedJson.msg || "No message"}`);
            }

            if (parsedJson.data === null) {
                return null;
            }

            return parsedJson.data;

        } catch (error) {
            console.error(`Error fetching GPA for semester ${semesterId}:`, error);
            return null;
        }
    }

    async function fetchCoursesList(semesterId) {
        const apiUrl = `https://tsinglanstudent.schoolis.cn/api/LearningTask/GetStuSubjectListForSelect?semesterId=${semesterId}`;
        try {
            const response = await fetch(apiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error("Network response error.");
            const parsedJson = await response.json();
            return parsedJson.data.map(course => ({
                courseName: course.name,
                subjectId: course.id,
                courseId: course.id
            }));
        } catch (error) {
            console.error("Error fetching course list:", error);
            return [];
        }
    }

    async function getClassId(taskId) {
        const apiUrl = `https://tsinglanstudent.schoolis.cn/api/LearningTask/GetDetail?learningTaskId=${taskId}`;
        try {
            const response = await fetch(apiUrl, { credentials: 'include' });
            if (!response.ok) throw new Error("Network response error.");
            const parsedJson = await response.json();
            return parsedJson.data;
        } catch (error) {
            console.error("Error fetching task details (for classId):", error);
            return null;
        }
    }

    async function getClassData(courseList, semesterId) {
        let enrichedClassData = [];
        for (const course of courseList) {
            try {
                const taskListUrl = `https://tsinglanstudent.schoolis.cn/api/LearningTask/GetList?semesterId=${semesterId}&subjectId=${course.subjectId}&pageIndex=1&pageSize=1`;
                const listResponse = await fetch(taskListUrl, { credentials: 'include' });
                if (!listResponse.ok) continue;

                const listJson = await listResponse.json();
                if (listJson.data.list && listJson.data.list.length > 0) {
                    const taskId = listJson.data.list[0].id;
                    const taskDetails = await getClassId(taskId);
                    if (taskDetails && taskDetails.classId) {
                        enrichedClassData.push({ ...course, classId: taskDetails.classId });
                    }
                }
            } catch (error) {
                console.error(`Error in getClassData for ${course.courseName}:`, error);
            }
        }
        return enrichedClassData;
    }

    async function getCourseScore(classData, semesterId) {
        let finalScores = {};
        for (const course of classData) {
            try {
                if (!course.classId || !course.subjectId) continue;
                const apiUrl = `https://tsinglanstudent.schoolis.cn/api/DynamicScore/GetDynamicScoreDetail?classId=${course.classId}&subjectId=${course.subjectId}&semesterId=${semesterId}`;
                const response = await fetch(apiUrl, { credentials: 'include' });
                if (!response.ok) {
                    continue;
                }

                const parsedJson = await response.json();
                if (parsedJson.state !== 0 || !parsedJson.data || !parsedJson.data.evaluationProjectList) {
                    continue;
                }

                const evaluationProjects = parsedJson.data.evaluationProjectList;
                let weightedScoreSum = 0;
                let completedProportionSum = 0;
                for (const project of evaluationProjects) {
                    if (!project.scoreIsNull) {
                        weightedScoreSum += project.score * (project.proportion / 100);
                        completedProportionSum += project.proportion;
                    }
                }
                let finalCalculatedScore = 0;
                if (completedProportionSum > 0) {
                    finalCalculatedScore = weightedScoreSum / (completedProportionSum / 100);
                }
                const gradeInfo = getGradeInfo(finalCalculatedScore);
                finalScores[course.courseId] = {
                    "finalCalculatedScore": finalCalculatedScore,
                    "overallScoreLevel": gradeInfo.level,
                    "overallGpa": gradeInfo.gpa,
                };
            } catch (error) {
                console.error(`Error processing score for ${course.courseName}:`, error);
            }
        }
        return finalScores;
    }

    function getGradeInfo(score) {
        for (const grade of gradingScale) {
            if (score >= grade.minValue && score <= grade.maxValue) {
                return {
                    level: grade.displayName,
                    gpa: grade.gpa
                };
            }
        }
        return {
            level: 'N/A',
            gpa: 0.0
        };
    }

    function displaydata(gpaData, courseList, courseScore) {
        let dashboardObject = {
            gpa: gpaData !== null ? gpaData : "N/A",
            courses: []
        };
        for (const course of courseList) {
            const scoreInfo = courseScore[course.courseId];
            if (scoreInfo) {
                dashboardObject.courses.push({
                    name: course.courseName,
                    score: scoreInfo.finalCalculatedScore,
                    grade: scoreInfo.overallScoreLevel,
                    gradePoint: scoreInfo.overallGpa
                });
            } else {
                dashboardObject.courses.push({
                    name: course.courseName,
                    score: "N/A",
                    grade: "N/A",
                    gradePoint: "N/A"
                });
            }
        }
        return dashboardObject;
    }

    function parseSemesterData(rawSemesterData) {
        const sortedData = rawSemesterData.sort((a, b) => b.id - a.id);
        return sortedData.map(semester => {
            const academicYear = `${semester.year}-${semester.year + 1}`;
            const displayName = `${academicYear} Semester ${semester.semester}`;
            return {
                id: semester.id,
                name: displayName
            };
        });
    }

    function createCourseCard(course) {
        const scoreDisplay = (course.score === "N/A" || isNaN(course.score)) ? "N/A" : course.score.toFixed(2);
        return `
            <div class="course-card">
                <div class="card-header">
                    <span class="course-name">${course.name}</span>
                    <span class="course-score">${scoreDisplay}</span>
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
        if (dashboardData.courses) {
            dashboardData.courses.forEach(course => {
                const cardHTML = createCourseCard(course);
                courseListElement.insertAdjacentHTML('beforeend', cardHTML);
            });
        }
    }

    async function initialize() {
        const semesters = await fetchSemesters();
        if (semesters.length > 0) {
            populateSemesterSelector(semesters);

            async function loadDashboard(semesterId) {
                gpaValueElement.textContent = '...';
                courseListElement.innerHTML = '<p>Loading course data...</p>';
                const gpa = await fetchGPA(semesterId);
                const courseList = await fetchCoursesList(semesterId);
                const classData = await getClassData(courseList, semesterId);
                const courseScore = await getCourseScore(classData, semesterId);
                const displayData = displaydata(gpa, courseList, courseScore);
                updateDashboardUI(displayData);
            }

            const initialSemesterId = semesters[1] ? semesters[1].id : semesters[0].id;
            semesterSelectorElement.value = initialSemesterId;
            await loadDashboard(initialSemesterId);

            semesterSelectorElement.addEventListener('change', async (event) => {
                const selectedSemesterId = event.target.value;
                await loadDashboard(selectedSemesterId);
stop
            });
        } else {
            semesterSelectorElement.innerHTML = '<option>Could not load semesters</option>';
            gpaValueElement.textContent = '---';
            courseListElement.innerHTML = '<p>Could not load semester data.</p>';
        }
    }

    initialize();
});