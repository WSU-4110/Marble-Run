// Finds the image for each item the player has equipped (see the shop_items table).
import { db } from './supabase.js';

// Returns e.g. { marble: 'images/marbles/marble2.jpg', landscape: '...', track: '...' }.
// Categories with no image are left out, so the race keeps its default for those.
export async function getEquippedImages(profile) {
    const ids = [
        profile.equipped_marble,
        profile.equipped_landscape,
        profile.equipped_track,
    ].filter(Boolean);

    if (ids.length === 0) return {};

    const { data, error } = await db
        .from('shop_items')
        .select('id, category, image')
        .in('id', ids);

    if (error) {
        console.error('Could not load equipped items:', error.message);
        return {};
    }

    const images = {};
    for (const item of data) {
        if (item.image) images[item.category] = item.image;
    }
    return images;
}
