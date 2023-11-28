import * as dotenv from 'dotenv';
import { EventDto } from './event.dto';

dotenv.config();

export async function fetchSchedule(): Promise<EventDto[]> {
  const res = await fetch(`${process.env.PARSER_URL}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // @ts-ignore
  return res.json();
}
