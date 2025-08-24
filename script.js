document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const dateSelect = document.getElementById('date-select');
    const yearSelect = document.getElementById('year-select');
    const playersSelect = document.getElementById('players-select');
    const weightSelect = document.getElementById('weight-select');
    const rankTypeSelect = document.getElementById('rank-type-select');
    const tableBody = document.getElementById('table-body');
    const tableHeader = document.getElementById('table-header');
    const paginationContainer = document.getElementById('pagination');

    let allGames = [];
    let filteredGames = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    const csvFiles = ['data/boardgames_re_ranked_2025-08-24.csv'];

    function populateDateFilter() {
        csvFiles.forEach(file => {
            const option = document.createElement('option');
            const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
            option.value = file;
            option.textContent = dateMatch ? dateMatch[1] : file;
            dateSelect.appendChild(option);
        });
    }

    function loadData(file) {
        Papa.parse(file, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                allGames = results.data.filter(g => g.id);
                applyFilters();
            }
        });
    }

    function applyFilters() {
        let tempGames = [...allGames];

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            tempGames = tempGames.filter(g => g.name && typeof g.name === 'string' && g.name.toLowerCase().includes(searchTerm));
        }

        const yearFilter = yearSelect.value;
        if (yearFilter !== 'all') {
            const currentYear = new Date().getFullYear();
            const yearsAgo = parseInt(yearFilter, 10);
            tempGames = tempGames.filter(g => g.yearpublished >= currentYear - yearsAgo);
        }

        const playersFilter = playersSelect.value;
        if (playersFilter !== 'all') {
            const numPlayers = parseInt(playersFilter, 10);
            tempGames = tempGames.filter(g => {
                const recommended = g.recommended_players;
                if (typeof recommended === 'number') {
                    return numPlayers === 10 ? recommended >= 10 : recommended === numPlayers;
                }
                if (typeof recommended === 'string' && recommended) {
                    const supportedPlayers = recommended.split('|').map(Number);
                    if (numPlayers === 10) {
                        return supportedPlayers.some(p => p >= 10);
                    }
                    return supportedPlayers.includes(numPlayers);
                }
                return false;
            });
        }

        const weightFilter = weightSelect.value;
        if (weightFilter !== 'all') {
            const [minWeight, maxWeight] = weightFilter.split('-').map(parseFloat);
            tempGames = tempGames.filter(g => g.weight >= minWeight && g.weight <= maxWeight);
        }

        const rankType = rankTypeSelect.value;
        if (rankType === 'new') {
            tempGames.sort((a, b) => a.new_rank - b.new_rank);
        } else {
            tempGames.sort((a, b) => a.original_rank - b.original_rank);
        }

        filteredGames = tempGames;
        currentPage = 1;
        render();
    }

    function render() {
        renderTableHeader();
        renderTableBody();
        renderPagination();
    }

    function renderTableHeader() {
        tableHeader.innerHTML = `
            <th class="rank-header">#</th>
            <th class="thumbnail-cell">이미지</th>
            <th class="name-header">이름</th>
            <th class="year">출시연도</th>
            <th class="weight">난이도</th>
            <th class="rating">평점</th>
            <th class="players">추천 인원</th>
        `;
    }

    function renderTableBody() {
        tableBody.innerHTML = '';
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageGames = filteredGames.slice(startIndex, endIndex);

        if (pageGames.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem;">표시할 게임이 없습니다.</td></tr>`;
            return;
        }

        const rankType = rankTypeSelect.value;
        const isNewRank = rankType === 'new';

        pageGames.forEach(game => {
            const row = document.createElement('tr');
            const rank = isNewRank ? game.new_rank : game.original_rank;
            const rating = isNewRank ? game.bayes_new_rating.toFixed(3) : game.average.toFixed(3);

            let playersText = 'N/A';
            const players = game.recommended_players;
            if (typeof players === 'number') {
                playersText = `${players}인`;
            } else if (typeof players === 'string' && players) {
                const playerCounts = players.split('|').map(Number).filter(n => !isNaN(n));
                if (playerCounts.length > 0) {
                    const min = Math.min(...playerCounts);
                    const max = Math.max(...playerCounts);
                    playersText = min === max ? `${min}인` : `${min}-${max}인`;
                }
            }

            let weightClass = '';
            const weight = game.weight;
            if (weight < 2) weightClass = 'weight-easy';
            else if (weight < 3) weightClass = 'weight-medium';
            else if (weight < 4) weightClass = 'weight-hard';
            else weightClass = 'weight-expert';

            const nameClass = game.name && game.name.length > 35 ? 'name long-name' : 'name';

            row.innerHTML = `
                <td class="rank">${rank}</td>
                <td class="thumbnail-cell"><img src="${game.thumbnail}" alt="${game.name || 'N/A'}" class="thumbnail"></td>
                <td class="${nameClass}">
                    <a href="https://boardgamegeek.com/boardgame/${game.id}" target="_blank">${game.name || '이름 없음'}</a>
                </td>
                <td class="year">${game.yearpublished}</td>
                <td class="weight">
                    <span class="weight-badge ${weightClass}">${game.weight.toFixed(2)}</span>
                </td>
                <td class="rating">${rating}</td>
                <td class="players">${playersText}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
        if (totalPages <= 1) return;

        const maxPagesToShow = 10;
        let startPage, endPage;

        if (totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = totalPages;
        } else {
            let maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            let maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        const createButton = (text, page, isDisabled = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = isDisabled;
            button.addEventListener('click', () => {
                currentPage = page;
                render();
            });
            return button;
        };

        const prevPage = Math.max(1, currentPage - 10);
        paginationContainer.appendChild(createButton('이전', prevPage, currentPage <= 1));

        for (let i = startPage; i <= endPage; i++) {
            const button = createButton(i, i);
            if (i === currentPage) button.classList.add('active');
            paginationContainer.appendChild(button);
        }

        const nextPage = Math.min(totalPages, currentPage + 10);
        paginationContainer.appendChild(createButton('다음', nextPage, currentPage === totalPages));
    }

    searchButton.addEventListener('click', applyFilters);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });

    dateSelect.addEventListener('change', (e) => loadData(e.target.value));
    [yearSelect, playersSelect, weightSelect, rankTypeSelect].forEach(sel => {
        sel.addEventListener('change', applyFilters);
    });

    populateDateFilter();
    if (csvFiles.length > 0) {
        loadData(csvFiles[0]);
    }
});
