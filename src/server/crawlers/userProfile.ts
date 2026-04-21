import { parseHTML } from 'linkedom';

export interface UserProfile {
  username: string;
  displayName: string;
  following: number;
  followers: number;
  totalEvents: number;
  favoriteArtists: FavoriteArtistWithCount[];
}

export interface FavoriteArtistWithCount {
  name: string;
  href: string;
  attendanceCount: number;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const url = `https://www.eventernote.com/users/${userId}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);

  const scoreTable = document.querySelector('div.gb_score_table table');
  const numberCells = scoreTable?.querySelectorAll('p.number a') || [];

  let following = 0;
  let followers = 0;
  let totalEvents = 0;

  for (const cell of numberCells) {
    const href = cell.getAttribute('href') || '';
    const value = parseInt(cell.textContent?.trim() || '0', 10);

    if (href.includes('/following')) following = value;
    else if (href.includes('/follower')) followers = value;
    else if (href.includes('/events')) totalEvents = value;
  }

  const profileDiv = document.querySelector('div.gb_users_side_profile');
  const username = profileDiv?.querySelector('h2.name1')?.textContent?.trim() || userId;
  const displayName = profileDiv?.querySelector('h3.name2')?.textContent?.trim() || '';

  const artistItems = document.querySelectorAll('ul.gb_actors_list li');
  const favoriteArtists: FavoriteArtistWithCount[] = [];

  for (const item of artistItems) {
    const link = item.querySelector('a');
    if (!link) continue;

    const name = link.textContent?.trim();
    const href = link.getAttribute('href');
    const className = item.getAttribute('class') || '';
    const countMatch = className.match(/c(\d+)/);
    const attendanceCount = countMatch ? parseInt(countMatch[1], 10) : 0;

    if (name && href) {
      favoriteArtists.push({ name, href, attendanceCount });
    }
  }

  console.log(`✅ Fetched profile for ${userId}: ${following} following, ${followers} followers, ${totalEvents} events, ${favoriteArtists.length} favorites`);

  return {
    username,
    displayName,
    following,
    followers,
    totalEvents,
    favoriteArtists
  };
}
