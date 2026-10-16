import { parseHTML } from 'linkedom';
import { readEventernote } from './readEventernote';

export interface ConnectedUser {
  userId: string;
  iconUrl: string | null;
}

export async function fetchUserConnections(userId: string, kind: 'following' | 'follower'): Promise<ConnectedUser[]> {
  const url = `https://www.eventernote.com/users/${encodeURIComponent(userId)}/${kind}`;

  const html = await readEventernote(url, 2);
  const { document } = parseHTML(html);
  const users: ConnectedUser[] = [];

  for (const link of document.querySelectorAll('div.gb_users_list li > a')) {
    const id = link.getAttribute('href')?.match(/^\/users\/([^/?#]+)$/)?.[1];
    if (!id) continue;
    const icon = link.querySelector('img')?.getAttribute('src') || '';
    users.push({
      userId: decodeURIComponent(id),
      iconUrl: icon && !icon.includes('no_profile_image') ? icon.replace(/^http:/, 'https:') : null
    });
  }

  return users;
}
