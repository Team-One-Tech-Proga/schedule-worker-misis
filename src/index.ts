import {PrismaClient} from '@prisma/client'
import CyrillicToTranslit from 'cyrillic-to-translit-js';
import {fetchSchedule} from "./utils/fetchSchedule";

const prisma = new PrismaClient()
// @ts-ignore
const cyrillicToTranslit = new CyrillicToTranslit();

async function main() {
    const group = await prisma.group.findUnique({where: {slug: 'mist-23-3'}})
    if (group === null) {
        throw new Error('Group not found id DB');
    }
    console.log('Find group entity: ', group);

    const university = await prisma.university.findUnique({where: {id: group.universityId}})
    if (university === null) {
        throw new Error('University not found id DB');
    }
    console.log('Find university entity: ', university);

    const parserData = await fetchSchedule();
    if (parserData.length < 1) {
        throw new Error('Parser data corrupt');
    }
    console.log('Fetch parser entities. Found: ', parserData.length);

    for (const i of parserData) {
        let description;
        let teacher;
        let subject;

        const indexTextOfSubject = i.subject.indexOf('\n');
        const splitsTextOfSubject = [
            i.subject.slice(0, indexTextOfSubject),
            i.subject.slice(indexTextOfSubject + 1),
        ];

        let teacherName = null;
        if (
            splitsTextOfSubject[1].includes('групп') ||
            splitsTextOfSubject[1].includes('платформ')
        ) {
            description = splitsTextOfSubject[1].trim();
        } else {
            description = '';
            teacherName = splitsTextOfSubject[1].trim();
            teacher = await prisma.teacher.findFirst({where: {name: teacherName}});
            console.log('teacher entity: ', teacher);
            if (teacher == null) {
                console.log('Create teacher: ', teacherName);
                teacher = await prisma.teacher.create({
                    data: {
                        name: teacherName,
                        slug: cyrillicToTranslit.transform(teacherName, '_').toLowerCase(),
                        universityId: university.id
                    }
                });
                console.log('Created teacher entity: ', teacher);
            }
        }

        const subjectName = splitsTextOfSubject[0].trim();
        subject = await prisma.subject.findFirst({ where: { nameRaw: subjectName }});
        if (subject == null) {
            console.log('Create subject: ', subjectName);
            subject = await prisma.subject.create({
                data: {
                    name: subjectName,
                    nameRaw: subjectName,
                    groupId: group.id,
                }
            });
            console.log('Created subject entity: ', subject);
        }

        const event = await prisma.event.create({
            data: {
                startAt: new Date(i['start']),
                endAt: new Date(i['end']),
                sourceId: 1,
                description: description,
                groupId: group.id,
                subjectId: subject.id,
                teacherId: teacher?.id,
            }
        })
    }
}

main()
    .catch(async (e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })