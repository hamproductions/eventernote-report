import { describe, it, expect } from 'vitest';
import { parseSearchResults } from '../searchEvents';

const fixture = `
<html><body>
<div class="container"><div class="row"><div class="span12 page">
<div class="gb_event_list clearfix">
  <ul>
    <li class="clearfix ">
      <div class="date">
        <p class="day0">2026-11-15 (<span class="wday0">日</span>)</p>
        <p><img src="464372_s.jpg" width="110" height="110"></p>
      </div>
      <div class="event">
        <h4><a href="/events/464372">ラブライブ！フェス Day.2</a></h4>
        <div class="place">
          会場: <a href="/places/8">バンテリンドーム ナゴヤ(ナゴヤドーム)</a>
        </div>
        <div class="place">
          <span class="s">開場 13:30 開演 15:30 終演 19:30</span>
        </div>
        <div class="actor">
          <ul>
            <li>出演者:</li>
            <li><a href="/actors/Aqours/15434">Aqours</a></li>
            <li><a href="/actors/x/8286">伊波杏樹</a></li>
          </ul>
        </div>
      </div>
    </li>
    <li class="clearfix ">
      <div class="date">
        <p class="day6">2025-06-07 (<span class="wday6">土</span>)</p>
      </div>
      <div class="event">
        <h4><a href="/events/123">Aqours LIVE</a></h4>
        <div class="place">
          会場: <a href="/places/9">Venue B</a>
        </div>
      </div>
    </li>
    <li class="clearfix ">
      <div class="event">
        <h4><a href="/events/999">Broken entry</a></h4>
      </div>
    </li>
  </ul>
</div>
</div></div></div>
</body></html>
`;

describe('parseSearchResults', () => {
  it('parses events from search result HTML', () => {
    const events = parseSearchResults(fixture);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      name: 'ラブライブ！フェス Day.2',
      href: '/events/464372',
      date: '2026-11-15',
      place: 'バンテリンドーム ナゴヤ(ナゴヤドーム)',
      artists: ['Aqours', '伊波杏樹']
    });
  });

  it('returns empty artists when actor list is missing', () => {
    const events = parseSearchResults(fixture);

    expect(events[1]).toEqual({
      name: 'Aqours LIVE',
      href: '/events/123',
      date: '2025-06-07',
      place: 'Venue B',
      artists: []
    });
  });

  it('skips entries missing date or place', () => {
    const events = parseSearchResults(fixture);

    expect(events.some(e => e.href === '/events/999')).toBe(false);
  });

  it('returns empty array for unrelated HTML', () => {
    expect(parseSearchResults('<html><body><p>nothing</p></body></html>')).toEqual([]);
  });
});
