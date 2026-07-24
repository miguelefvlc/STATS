const playerUrls1 = [
    "https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/3155526/dillon-brooks",
    "https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/4397020/luguentz-dort",
    "https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/6589/draymond-green",
    "https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/4066262/malik-monk",
    "https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/4684275/rob-dillingham",
    "https://www.espn.com/nba/player/_/id/6442/kyrie-irving",
    "https://www.espn.com/nba/player/_/id/4433136/walker-kessler",
    "https://www.espn.com/nba/player/_/id/3059319/andrew-wiggins",
    "https://www.espn.com/nba/player/_/id/4432241/jamal-shead",
    "https://www.espn.com/nba/player/_/id/4997536/gui-santos",
    "https://www.espn.com/nba/player/_/id/5105637/adem-bona",
    "https://www.espn.com/nba/player/_/id/5105837/bruce-thornton",
    "https://www.espn.com/nba/player/_/id/4432181/julian-strawther",
    "https://www.espn.com/nba/player/_/id/5061603/thomas-sorber",
    "https://www.espn.com/nba/player/_/id/4278402/jordan-goodwin"
];

// URLs para la tabla de seguimiento independiente
const playerUrls2 = [
    "https://www.espn.com/nba/player/_/id/4066259/deaaron-fox",
    "https://www.espn.com/nba/player/_/id/4606840/jamir-watkins",
    "https://www.espn.com/nba/player/_/id/4684208/brooks-barnhizer"
];

// Initialize the table with skeleton rows
function renderSkeletons(tbody, count) {
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (count === 0) {
        tbody.innerHTML = `<tr><td colspan="19" style="padding: 2rem; color: var(--text-secondary); text-align: center;">No hay jugadores en esta lista.</td></tr>`;
        return;
    }

    for (let i = 0; i < count; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="player-col">
                <div class="player-info">
                    <div class="skeleton skeleton-img"></div>
                    <div>
                        <div class="skeleton skeleton-text" style="width: 100px; margin-bottom: 4px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60px;"></div>
                    </div>
                </div>
            </td>
            ${Array(18).fill('<td><div class="skeleton skeleton-text"></div></td>').join('')}
        `;
        tbody.appendChild(tr);
    }
}

// Funciones de caché
const CACHE_PREFIX = 'nba_stats_v2_';
const PROFILE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días
const GAMELOG_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedData(storage, key) {
    try {
        const item = storage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expiry) {
            storage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch (e) {
        return null;
    }
}

function setCachedData(storage, key, data, ttl) {
    try {
        storage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data: data,
            expiry: Date.now() + ttl
        }));
    } catch (e) {}
}

// Fetch and parse data for a single player using ESPN's JSON API directly
async function fetchPlayerStats(url) {
    try {
        // Extract player ID from the URL (e.g., .../id/3155526/dillon-brooks)
        const match = url.match(/\/id\/(\d+)\//);
        if (!match) throw new Error('Invalid URL format');
        const playerId = match[1];

        const profileKey = `profile_${playerId}`;
        const gamelogKey = `gamelog_${playerId}`;

        let profile = getCachedData(localStorage, profileKey);
        let gamelog = getCachedData(sessionStorage, gamelogKey);

        const fetchPromises = [];
        
        if (!profile) {
            fetchPromises.push(
                fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}`)
                .then(res => { if (!res.ok) throw new Error('Profile fetch failed'); return res.json(); })
                .then(data => { setCachedData(localStorage, profileKey, data, PROFILE_TTL); return data; })
            );
        } else {
            fetchPromises.push(Promise.resolve(profile));
        }

        if (!gamelog) {
            fetchPromises.push(
                fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}/gamelog`)
                .then(res => { if (!res.ok) throw new Error('Gamelog fetch failed'); return res.json(); })
                .then(data => { setCachedData(sessionStorage, gamelogKey, data, GAMELOG_TTL); return data; })
            );
        } else {
            fetchPromises.push(Promise.resolve(gamelog));
        }

        const [finalProfile, finalGamelog] = await Promise.all(fetchPromises);
        profile = finalProfile;
        gamelog = finalGamelog;

        // Parse Name and Image
        const name = profile?.athlete?.displayName || 'Jugador Desconocido';
        const imgSrc = profile?.athlete?.headshot?.href || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

        // Find stats array and labels array
        let labels = gamelog?.labels || [];
        let stats = [];
        let eventInfo = null;

        // ESPN groups by seasonType (e.g. Regular Season, Postseason)
        // Find the first seasonType that has valid events
        if (gamelog?.seasonTypes) {
            for (const seasonType of gamelog.seasonTypes) {
                if (!seasonType.categories) continue;
                for (const category of seasonType.categories) {
                    if (category.events && category.events.length > 0) {
                        const event = category.events[0];
                        stats = event.stats || [];
                        if (event.eventId && gamelog.events && gamelog.events[event.eventId]) {
                            eventInfo = gamelog.events[event.eventId];
                        }
                        break;
                    }
                }
                if (stats.length > 0) break;
            }
        }

        // Si no hay stats (jugador lesionado o no ha jugado), no lanzamos error,
        // simplemente dejamos que el código continúe y devuelva '-' en todo.
        let fecha = '-';
        let op = '-';
        let resultado = '-';
        let rawDate = null;
        let isToday = false;

        if (eventInfo) {
            if (eventInfo.gameDate) {
                rawDate = eventInfo.gameDate;
                try {
                    const dateObj = new Date(rawDate);
                    if (!isNaN(dateObj.getTime())) {
                        fecha = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                        
                        const today = new Date();
                        if (dateObj.getDate() === today.getDate() && 
                            dateObj.getMonth() === today.getMonth() && 
                            dateObj.getFullYear() === today.getFullYear()) {
                            isToday = true;
                        }
                    }
                } catch(e) {}
            }
            if (eventInfo.opponent) {
                op = eventInfo.opponent.abbreviation || '?';
            }
            if (eventInfo.gameResult) {
                resultado = eventInfo.gameResult === 'W' ? 'V' : (eventInfo.gameResult === 'L' ? 'D' : eventInfo.gameResult);
            }
        }

        const getStat = (labelKey) => {
            const index = labels.findIndex(l => (l || '').toUpperCase() === labelKey.toUpperCase());
            return index !== -1 && stats[index] !== undefined ? stats[index] : '-';
        };

        const pts = getStat('PTS');
        const reb = getStat('REB');
        const ast = getStat('AST');
        const stl = getStat('STL') !== '-' ? getStat('STL') : getStat('ROB');
        const blk = getStat('BLK');
        const fg = getStat('FG') !== '-' ? getStat('FG') : getStat('TC');
        const ft = getStat('FT');
        const to = getStat('TO');

        let val = '-';
        let ratingNum = null;
        let per36Text = '';
        
        if (pts !== '-' && reb !== '-' && ast !== '-' && stl !== '-' && blk !== '-' && to !== '-' && fg !== '-' && ft !== '-') {
            try {
                let fgm = 0, fga = 0, ftm = 0, fta = 0;
                if (fg && fg.includes('-')) {
                    const parts = fg.split('-');
                    fgm = parseInt(parts[0], 10) || 0;
                    fga = parseInt(parts[1], 10) || 0;
                }
                if (ft && ft.includes('-')) {
                    const parts = ft.split('-');
                    ftm = parseInt(parts[0], 10) || 0;
                    fta = parseInt(parts[1], 10) || 0;
                }
                const missedFG = fga - fgm;
                const missedFT = fta - ftm;
                let rawVal = (parseInt(pts, 10) || 0) + (parseInt(reb, 10) || 0) + (parseInt(ast, 10) || 0) + (parseInt(stl, 10) || 0) + (parseInt(blk, 10) || 0) - missedFG - missedFT - (parseInt(to, 10) || 0);
                
                let minPlayed = 0;
                const minStr = getStat('MIN');
                if (minStr && minStr !== '-' && minStr.includes(':')) {
                    const parts = minStr.split(':');
                    minPlayed = parseInt(parts[0], 10) + (parseInt(parts[1] || 0, 10) / 60);
                } else if (minStr && !isNaN(parseInt(minStr, 10))) {
                    minPlayed = parseInt(minStr, 10);
                }
                
                if (minPlayed > 0) {
                    const rawPer36 = (rawVal / minPlayed) * 36;
                    let ratingPer36 = (rawPer36 / 35) * 10;
                    ratingPer36 = Math.max(0, Math.min(10, ratingPer36));
                    per36Text = `Valoración por 36': ${ratingPer36.toFixed(1)}`;
                }

                // Escalar sobre 10 (asumiendo que 35 de Eficiencia es un 10 perfecto)
                let rating = (rawVal / 35) * 10;
                ratingNum = Math.max(0, Math.min(10, rating)); // Limitar entre 0 y 10
                if (!isNaN(ratingNum)) {
                    val = ratingNum.toFixed(1);
                }
            } catch(e) {
                console.warn('Error calculating rating for', name, e);
            }
        }

        const formatPct = (valStr) => {
            if (!valStr || valStr === '-') return '-';
            const num = parseFloat(valStr);
            return isNaN(num) ? valStr : Math.round(num).toString() + '%';
        };

        return {
            name, imgSrc, fecha, rawDate, isToday, op, resultado,
            min: getStat('MIN'),
            pts, reb, ast, stl, blk, fg,
            fgPct: formatPct(getStat('FG%')),
            pt3: getStat('3PT'),
            pt3Pct: formatPct(getStat('3P%')),
            ft,
            ftPct: formatPct(getStat('FT%')),
            pf: getStat('PF'),
            to, val, rating: ratingNum, per36Text,
            error: null
        };

    } catch (error) {
        console.error("Error fetching/parsing:", url, error);
        return {
            url,
            error: true
        };
    }
}

// Render a specific row
function appendPlayerRow(tbody, data) {
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    
    if (data.error) {
        tr.innerHTML = `
            <td class="player-col" colspan="19">
                <div class="player-info" style="color: var(--error-color)">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 8px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Error al cargar datos de una URL (${data.url})
                </div>
            </td>
        `;
    } else {
        const resultadoColor = data.resultado === 'V' ? 'var(--success-color)' : (data.resultado === 'D' ? 'var(--error-color)' : 'inherit');
        const isTodayBadge = data.isToday ? '<span class="status-badge status-success" style="font-size: 0.55rem; padding: 0.1rem 0.25rem; margin-left: 0.25rem;">HOY</span>' : '';
        const toDisplay = (data.to !== '-' && data.to > 3) ? data.to : `<span style="color: var(--text-primary)">${data.to}</span>`;
        const ratingBadge = (data.rating !== null && !isNaN(data.rating)) ? `<span class="rating-badge" style="background-color: hsl(${(data.rating / 10) * 120}, 80%, 45%);">${data.val}</span>` : data.val;
        const per36Attr = data.per36Text ? `data-tooltip="${data.per36Text}"` : '';
        
        tr.innerHTML = `
            <td class="player-col">
                <div class="player-info">
                    <img src="${data.imgSrc}" alt="${data.name}" class="player-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23ccc\\'><path d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/></svg>'">
                    <div class="player-name">${data.name}</div>
                </div>
            </td>
            <td style="color: var(--text-secondary); line-height: 1.1; white-space: nowrap;">
                ${data.fecha} ${isTodayBadge}
            </td>
            <td style="font-weight: 600;">${data.op}</td>
            <td style="font-weight: 700; color: ${resultadoColor}">${data.resultado}</td>
            <td style="color: var(--text-primary);"><strong>${data.min}</strong></td>
            <td>${data.fg}</td>
            <td style="color: var(--text-secondary);">${data.fgPct}</td>
            <td>${data.pt3}</td>
            <td style="color: var(--text-secondary);">${data.pt3Pct}</td>
            <td>${data.ft}</td>
            <td style="color: var(--text-secondary);">${data.ftPct}</td>
            <td>${data.reb}</td>
            <td>${data.ast}</td>
            <td>${data.blk}</td>
            <td>${data.stl}</td>
            <td>${data.pf}</td>
            <td style="color: var(--error-color);">${toDisplay}</td>
            <td class="pts-col">${data.pts}</td>
            <td class="val-col custom-tooltip" ${per36Attr}>
                ${ratingBadge}
            </td>
        `;
    }

    tbody.appendChild(tr);
}

// Function to refresh a specific table
async function refreshTable(urls, tbodyId, btnId) {
    const tbody = document.getElementById(tbodyId);
    const btn = document.getElementById(btnId);
    if (!tbody) return;
    
    let icon = null;
    if (btn) {
        icon = btn.querySelector('.refresh-icon');
        if (icon) icon.classList.add('spin');
    }

    renderSkeletons(tbody, urls.length);

    if (urls.length === 0) {
        if (icon) icon.classList.remove('spin');
        return;
    }

    try {
        // Ejecutar en lotes de 5 para no saturar las conexiones
        const results = [];
        const batchSize = 5;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchPromises = batch.map(url => fetchPlayerStats(url));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        // Sort por fecha (más reciente primero)
        results.sort((a, b) => {
            const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
            const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
            return dateB - dateA;
        });

        tbody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        results.forEach(data => {
            try {
                appendPlayerRow(fragment, data);
            } catch (err) {
                console.error('Error procesando fila:', err, data);
            }
        });
        
        tbody.appendChild(fragment);
    } catch (e) {
        console.error("Refresh Error en la tabla " + tbodyId + ":", e);
        tbody.innerHTML = `<tr><td colspan="19" style="padding: 2rem; color: var(--error-color); text-align: center;">Error al cargar los datos.</td></tr>`;
    } finally {
        if (icon) icon.classList.remove('spin');
    }
}

// Helper to refresh all tables
function refreshAll() {
    refreshTable(playerUrls1, 'stats-body-1', 'refresh-btn-all');
    refreshTable(playerUrls2, 'stats-body-2', 'refresh-btn-all');
}

// Setup Event Listeners
const refreshBtn = document.getElementById('refresh-btn-all');
if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshAll);
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    refreshAll();
});
