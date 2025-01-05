import { animation_duration, eventSource, event_types } from '../../../../script.js';
import { power_user } from '../../../power-user.js';
import { retriggerFirstMessageOnEmptyChat, getUserAvatar, getUserAvatars, setUserAvatar, user_avatar } from '../../../personas.js';
import { extension_settings } from '../../../extensions.js';

let popper = null;
let isOpen = false;

const MODULE_NAME = 'quick_persona';
const default_settings = {
    favorite_personas: [],
    show_favorites_only: false,
};

// Initialize settings if not already done
function initializeQuickPersonaSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = structuredClone(default_settings);
    }
}

function getQuickPersonaSettings(key) {
    return extension_settings[MODULE_NAME]?.[key] ?? default_settings[key];
}

function setQuickPersonaSettings(key, value) {
    extension_settings[MODULE_NAME][key] = value;
    saveSettingsDebounced(); // Assuming this function is available for debouncing saves
}

function addQuickPersonaButton() {
    const quickPersonaButton = `
    <div id="quickPersona" class="interactable" tabindex="0">
        <img id="quickPersonaImg" src="/img/ai4.png" />
        <div id="quickPersonaCaret" class="fa-fw fa-solid fa-caret-up"></div>
        <button id="toggleFavorites">Toggle Favorites</button>
    </div>`;
    $('#leftSendForm').append(quickPersonaButton);
    $('#quickPersona').on('click', () => {
        toggleQuickPersonaSelector();
    });
    $('#toggleFavorites').on('click', () => {
        const showFavoritesOnly = !getQuickPersonaSettings('show_favorites_only');
        setQuickPersonaSettings('show_favorites_only', showFavoritesOnly);
        if (isOpen) {
            closeQuickPersonaSelector();
            openQuickPersonaSelector();
        }
    });
}

async function toggleQuickPersonaSelector() {
    if (isOpen) {
        closeQuickPersonaSelector();
        return;
    }
    await openQuickPersonaSelector();
}

async function openQuickPersonaSelector() {
    isOpen = true;
    const userAvatars = await getUserAvatars(false);
    const quickPersonaList = $('<div id="quickPersonaMenu"><ul class="list-group"></ul></div>');
    const favoritePersonas = getQuickPersonaSettings('favorite_personas');
    const showFavoritesOnly = getQuickPersonaSettings('show_favorites_only');
    for (const userAvatar of userAvatars) {
        if (showFavoritesOnly && !favoritePersonas.includes(userAvatar)) continue;
        const imgUrl = `${getUserAvatar(userAvatar)}?t=${Date.now()}`;
        const imgTitle = power_user.personas[userAvatar] || userAvatar;
        const isSelected = userAvatar === user_avatar;
        const isDefault = userAvatar === power_user.default_persona;
        const listItem = $('<li tabindex="0" class="list-group-item interactable"><img class="quickPersonaMenuImg"/><button class="favoriteToggle">★</button></li>');
        listItem.find('img').attr('src', imgUrl).attr('title', imgTitle).toggleClass('selected', isSelected).toggleClass('default', isDefault);
        listItem.find('.favoriteToggle').toggleClass('favorited', favoritePersonas.includes(userAvatar)).on('click', (e) => {
            e.stopPropagation();
            toggleFavorite(userAvatar);
        });
        listItem.on('click', () => {
            closeQuickPersonaSelector();
            setUserAvatar(userAvatar);
            changeQuickPersona();
            retriggerFirstMessageOnEmptyChat();
        });
        quickPersonaList.find('ul').append(listItem);
    }
    quickPersonaList.hide();
    $(document.body).append(quickPersonaList);
    $('#quickPersonaCaret').toggleClass('fa-caret-up fa-caret-down');
    $('#quickPersonaMenu').fadeIn(animation_duration);
    popper = Popper.createPopper(document.getElementById('quickPersona'), document.getElementById('quickPersonaMenu'), {
        placement: 'top-start',
    });
    popper.update();
}

function closeQuickPersonaSelector() {
    isOpen = false;
    $('#quickPersonaCaret').toggleClass('fa-caret-up fa-caret-down');
    $('#quickPersonaMenu').fadeOut(animation_duration, () => {
        $('#quickPersonaMenu').remove();
    });
    popper.destroy();
}

function toggleFavorite(userAvatar) {
    let favoritePersonas = getQuickPersonaSettings('favorite_personas');
    if (favoritePersonas.includes(userAvatar)) {
        favoritePersonas = favoritePersonas.filter(fav => fav !== userAvatar);
    } else {
        favoritePersonas.push(userAvatar);
    }
    setQuickPersonaSettings('favorite_personas', favoritePersonas);
}

function changeQuickPersona() {
    setTimeout(() => {
        const imgUrl = `${getUserAvatar(user_avatar)}?t=${Date.now()}`;
        const imgTitle = power_user.personas[user_avatar] || user_avatar;
        $('#quickPersonaImg').attr('src', imgUrl).attr('title', imgTitle);
    }, 100);
}

jQuery(() => {
    initializeQuickPersonaSettings();
    addQuickPersonaButton();
    eventSource.on(event_types.CHAT_CHANGED, changeQuickPersona);
    eventSource.on(event_types.SETTINGS_UPDATED, changeQuickPersona);
    $(document.body).on('click', (e) => {
        if (isOpen && !e.target.closest('#quickPersonaMenu') && !e.target.closest('#quickPersona')) {
            closeQuickPersonaSelector();
        }
    });
    changeQuickPersona();
});