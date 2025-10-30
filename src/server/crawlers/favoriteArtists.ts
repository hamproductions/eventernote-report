import { parseHTML } from 'linkedom';

export interface FavoriteArtist {
  name: string;
  href: string;
}

export async function fetchFavoriteArtists(
  userId: string
): Promise<FavoriteArtist[]> {
  const url = `https://www.eventernote.com/users/${userId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Find the favorite artists section by heading
    const headings = document.querySelectorAll('h2');
    let favoriteContainer = null;

    for (const heading of headings) {
      if (heading.textContent?.includes('お気に入り声優/アーティスト')) {
        favoriteContainer = heading.parentElement;
        break;
      }
    }

    const artists: FavoriteArtist[] = [];

    if (favoriteContainer) {
      // Find all artist links within the favorite container
      const artistLinks = favoriteContainer.querySelectorAll('a[href^="/actors/"]');
      const seenNames = new Set<string>();

      for (const link of artistLinks) {
        const name = link.textContent?.trim();
        const href = link.getAttribute('href');

        if (name && href && !seenNames.has(name)) {
          artists.push({ name, href });
          seenNames.add(name);
        }
      }
    }

    console.log(`✅ Fetched ${artists.length} favorite artists for user ${userId}`);
    return artists;

  } catch (error) {
    console.error('❌ Error fetching favorite artists:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch favorite artists: ${error.message}`
        : 'Failed to fetch favorite artists from Eventernote'
    );
  }
}
