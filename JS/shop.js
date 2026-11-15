// Shop screen: lists marbles, landscapes and tracks from the shop_items table,
// shows which ones the player owns/has equipped, and buys/equips through the
// purchase_item / equip_item database functions (see sql/shop.sql).
import { db } from './supabase.js';
import { requireLogin, isGuest } from './auth.js';

// Which profile column holds the equipped item for each category
const EQUIP_COLUMN = {
    marble: 'equipped_marble',
    landscape: 'equipped_landscape',
    track: 'equipped_track',
};

const DEFAULT_TRACK = 'classic-track';

const ui = {
    coinCount: document.getElementById('coin-count'),
    guestNote: document.getElementById('guest-note'),
    tabs: document.querySelectorAll('.tab'),
    grid: document.getElementById('item-grid'),
    msg: document.getElementById('shop-msg'),

    modal: document.getElementById('confirm-modal'),
    confirmPreview: document.getElementById('confirm-preview'),
    confirmText: document.getElementById('confirm-text'),
    confirmBuy: document.getElementById('confirm-buy'),
    confirmCancel: document.getElementById('confirm-cancel'),
};

// Everything the page needs to draw itself
const state = {
    items: [],              // rows from shop_items
    profile: null,          // coins, unlocked_items, equipped_*
    category: 'marble',     // the open tab
    pendingItem: null,      // item waiting for purchase confirmation
    busy: false,            // true while a request is in flight
};


// ---------- Ownership helpers ----------
function ownsItem(item) {
    // price 0 items are free defaults that everyone owns
    return item.price === 0 || (state.profile.unlocked_items ?? []).includes(item.id);
}

function isEquipped(item) {
    return state.profile[EQUIP_COLUMN[item.category]] === item.id;
}


// ---------- Drawing ----------
function showMessage(text, type = '') {
    ui.msg.textContent = text;
    ui.msg.className = 'msg ' + type;
}

function makePreview(item) {
    const preview = document.createElement('div');
    preview.className = 'preview ' + item.category;
    preview.style.setProperty('--c1', item.colors?.[0] ?? '#ccc');
    preview.style.setProperty('--c2', item.colors?.[1] ?? '#999');

    // Use the item's picture from the images folder when it has one
    if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.loading = 'lazy';
        // If the file is missing, swap in the color swatch instead
        img.addEventListener('error', () => {
            preview.replaceWith(makePreview({ ...item, image: null }));
        });
        preview.classList.add('has-image');
        preview.append(img);
        return preview;
    }

    if (item.category === 'marble') {
        preview.append(Object.assign(document.createElement('div'), { className: 'ball' }));
    } else if (item.category === 'track') {
        preview.append(Object.assign(document.createElement('div'), { className: 'lane' }));
    }
    return preview;
}

function makeCard(item) {
    const owned = ownsItem(item);
    const equipped = isEquipped(item);

    const card = document.createElement('article');
    card.className = 'card' + (equipped ? ' equipped' : '');

    if (owned) {
        const badge = document.createElement('span');
        badge.className = 'badge' + (equipped ? ' equipped' : '');
        badge.textContent = equipped ? 'Equipped' : 'Owned';
        card.append(badge);
    }

    const name = document.createElement('h3');
    name.textContent = item.name;

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = item.price === 0 ? 'Free' : `🪙 ${item.price}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';

    if (owned) {
        button.classList.add('equip');
        button.textContent = equipped ? 'Equipped' : 'Equip';
        button.disabled = equipped || state.busy || isGuest();
        button.addEventListener('click', () => equip(item));
    } else {
        const missing = item.price - (state.profile.coins ?? 0);
        button.classList.add('buy');
        if (isGuest()) {
            button.textContent = 'Log in to buy';
            button.disabled = true;
        } else if (missing > 0) {
            button.textContent = `Need ${missing} more`;
            button.disabled = true;
        } else {
            button.textContent = 'Buy';
            button.disabled = state.busy;
            button.addEventListener('click', () => openConfirm(item));
        }
    }

    card.append(makePreview(item), name, price, button);
    return card;
}

function render() {
    ui.coinCount.textContent = state.profile.coins ?? 0;

    ui.tabs.forEach((tab) => {
        tab.setAttribute('aria-selected', String(tab.dataset.category === state.category));
    });

    const items = state.items.filter((item) => item.category === state.category);
    ui.grid.replaceChildren(...items.map(makeCard));

    if (items.length === 0) {
        ui.grid.innerHTML = '<p class="loading">Nothing here yet.</p>';
    }
}


// ---------- Buying ----------
function openConfirm(item) {
    state.pendingItem = item;
    ui.confirmPreview.replaceChildren(makePreview(item));
    const after = (state.profile.coins ?? 0) - item.price;
    ui.confirmText.textContent = `Buy ${item.name} for ${item.price} coins? You'll have ${after} left.`;
    ui.modal.hidden = false;
    ui.confirmBuy.focus();
}

function closeConfirm() {
    state.pendingItem = null;
    ui.modal.hidden = true;
}

async function buy(item) {
    state.busy = true;
    render();

    // The server checks the price and coin balance; the page can't change those itself.
    const { data, error } = await db.rpc('purchase_item', { p_item_id: item.id });

    state.busy = false;
    if (error) {
        showMessage(error.message, 'error');
        render();
        return;
    }

    state.profile.coins = data.coins;
    state.profile.unlocked_items = data.unlocked_items;
    showMessage(`You bought ${item.name}!`, 'ok');
    render();
}

async function equip(item) {
    state.busy = true;
    render();

    const { error } = await db.rpc('equip_item', { p_item_id: item.id });

    state.busy = false;
    if (error) {
        showMessage(error.message, 'error');
    } else {
        state.profile[EQUIP_COLUMN[item.category]] = item.id;
        showMessage(`${item.name} equipped.`, 'ok');
    }
    render();
}


// ---------- Events ----------
ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        state.category = tab.dataset.category;
        showMessage('');
        render();
    });
});

ui.confirmCancel.addEventListener('click', closeConfirm);
ui.confirmBuy.addEventListener('click', () => {
    const item = state.pendingItem;
    closeConfirm();
    if (item) buy(item);
});
ui.modal.addEventListener('click', (e) => {
    if (e.target === ui.modal) closeConfirm();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ui.modal.hidden) closeConfirm();
});


// ---------- Load ----------
async function loadProfile() {
    const profile = await requireLogin();   // guests get the local guest profile
    if (!profile || isGuest()) return profile;

    // Re-read with * so we also get equipped_track (added by sql/shop.sql)
    const { data, error } = await db.from('profiles').select('*').eq('id', profile.id).single();
    return error ? profile : data;
}

async function loadShop() {
    const [profile, catalog] = await Promise.all([
        loadProfile(),
        db.from('shop_items').select('*').order('sort_order'),
    ]);
    if (!profile) return;   // requireLogin is redirecting

    state.profile = { equipped_track: DEFAULT_TRACK, ...profile };
    ui.guestNote.hidden = !isGuest();

    if (catalog.error) {
        console.error('Could not load shop items:', catalog.error.message);
        ui.grid.innerHTML = '<p class="loading">The shop is unavailable right now.</p>';
        ui.coinCount.textContent = state.profile.coins ?? 0;
        return;
    }

    state.items = catalog.data;
    render();
}

loadShop();
