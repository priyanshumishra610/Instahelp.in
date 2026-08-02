(function () {
  'use strict';

  var SECTIONS = [
    { id: 'popular', title: 'Popular Stores' },
    { id: 'grocery', title: 'Grocery' },
    { id: 'beauty', title: 'Beauty' },
    { id: 'electronics', title: 'Electronics' },
    { id: 'fashion', title: 'Fashion' },
    { id: 'health', title: 'Health' },
    { id: 'home', title: 'Home' },
    { id: 'jewelry', title: 'Jewelry' },
    { id: 'sports', title: 'Sports' },
    { id: 'kids', title: 'Kids' },
    { id: 'travel', title: 'Travel' },
    { id: 'entertainment', title: 'Entertainment' }
  ];

  var STORES = [
    /* Popular Stores — India's most-used shopping apps */
    { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.in/', category: 'popular', logo: 'amazon.svg', logoType: 'wordmark' },
    { id: 'flipkart', name: 'Flipkart', url: 'https://www.flipkart.com/', category: 'popular' },
    { id: 'myntra', name: 'Myntra', url: 'https://www.myntra.com/', category: 'popular' },
    { id: 'meesho', name: 'Meesho', url: 'https://www.meesho.com/', category: 'popular' },
    { id: 'blinkit', name: 'Blinkit', url: 'https://blinkit.com/', category: 'popular' },
    { id: 'zepto', name: 'Zepto', url: 'https://www.zeptonow.com/', category: 'popular' },
    { id: 'swiggy', name: 'Swiggy Instamart', url: 'https://www.swiggy.com/instamart', category: 'popular' },
    { id: 'tata1mg', name: 'Tata 1mg', url: 'https://www.1mg.com/', category: 'popular' },
    { id: 'snapdeal', name: 'Snapdeal', url: 'https://www.snapdeal.com/', category: 'popular' },

    /* Grocery — quick commerce & fresh food */
    { id: 'bigbasket', name: 'BigBasket', url: 'https://www.bigbasket.com/', category: 'grocery' },
    { id: 'dmart', name: 'DMart Ready', url: 'https://www.dmart.in/', category: 'grocery' },
    { id: 'jiomart', name: 'JioMart', url: 'https://www.jiomart.com/', category: 'grocery' },
    { id: 'naturesbasket', name: "Nature's Basket", url: 'https://www.naturesbasket.co.in/', category: 'grocery' },
    { id: 'spencers', name: "Spencer's", url: 'https://www.spencers.in/', category: 'grocery' },
    { id: 'licious', name: 'Licious', url: 'https://www.licious.in/', category: 'grocery' },
    { id: 'freshtohome', name: 'FreshToHome', url: 'https://www.freshtohome.com/', category: 'grocery' },
    { id: 'countrydelight', name: 'Country Delight', url: 'https://countrydelight.in/', category: 'grocery' },

    /* Beauty — skincare, makeup & personal care */
    { id: 'nykaa', name: 'Nykaa', url: 'https://www.nykaa.com/', category: 'beauty' },
    { id: 'purplle', name: 'Purplle', url: 'https://www.purplle.com/', category: 'beauty' },
    { id: 'mamaearth', name: 'Mamaearth', url: 'https://mamaearth.in/', category: 'beauty' },
    { id: 'smytten', name: 'Smytten', url: 'https://www.smytten.com/', category: 'beauty' },
    { id: 'forestessentials', name: 'Forest Essentials', url: 'https://www.forestessentialsindia.com/', category: 'beauty' },
    { id: 'sephora', name: 'Sephora India', url: 'https://sephora.nnnow.com/', category: 'beauty' },
    { id: 'minimalist', name: 'Minimalist', url: 'https://beminimalist.co/', category: 'beauty' },
    { id: 'dotandkey', name: 'Dot & Key', url: 'https://www.dotandkey.com/', category: 'beauty' },
    { id: 'sugar', name: 'SUGAR Cosmetics', url: 'https://in.sugarcosmetics.com/', category: 'beauty' },
    { id: 'lakme', name: 'Lakme', url: 'https://www.lakmeindia.com/', category: 'beauty' },

    /* Electronics — gadgets, appliances & tech */
    { id: 'croma', name: 'Croma', url: 'https://www.croma.com/', category: 'electronics' },
    { id: 'reliancedigital', name: 'Reliance Digital', url: 'https://www.reliancedigital.in/', category: 'electronics' },
    { id: 'samsung', name: 'Samsung', url: 'https://www.samsung.com/in/', category: 'electronics' },
    { id: 'vijaysales', name: 'Vijay Sales', url: 'https://www.vijaysales.com/', category: 'electronics' },
    { id: 'apple', name: 'Apple India', url: 'https://www.apple.com/in/shop', category: 'electronics' },
    { id: 'boat', name: 'boAt', url: 'https://www.boat-lifestyle.com/', category: 'electronics' },
    { id: 'oneplus', name: 'OnePlus', url: 'https://www.oneplus.in/', category: 'electronics' },
    { id: 'mi', name: 'Xiaomi', url: 'https://www.mi.com/in/', category: 'electronics' },
    { id: 'dell', name: 'Dell', url: 'https://www.dell.com/en-in/shop', category: 'electronics' },
    { id: 'lenovo', name: 'Lenovo', url: 'https://www.lenovo.com/in/en/', category: 'electronics' },
    { id: 'noise', name: 'Noise', url: 'https://www.gonoise.com/', category: 'electronics' },

    /* Fashion — apparel, footwear & accessories */
    { id: 'ajio', name: 'Ajio', url: 'https://www.ajio.com/', category: 'fashion' },
    { id: 'nykaafashion', name: 'Nykaa Fashion', url: 'https://www.nykaafashion.com/', category: 'fashion' },
    { id: 'lenskart', name: 'Lenskart', url: 'https://www.lenskart.com/', category: 'fashion' },
    { id: 'tatacliq', name: 'Tata CLiQ', url: 'https://www.tatacliq.com/', category: 'fashion' },
    { id: 'hm', name: 'H&M', url: 'https://www2.hm.com/en_in', category: 'fashion' },
    { id: 'snitch', name: 'Snitch', url: 'https://www.snitch.co.in/', category: 'fashion' },
    { id: 'zara', name: 'Zara', url: 'https://www.zara.com/in/', category: 'fashion' },
    { id: 'uniqlo', name: 'Uniqlo', url: 'https://www.uniqlo.com/in/en/', category: 'fashion' },
    { id: 'bewakoof', name: 'Bewakoof', url: 'https://www.bewakoof.com/', category: 'fashion' },
    { id: 'fabindia', name: 'FabIndia', url: 'https://www.fabindia.com/', category: 'fashion' },

    /* Health — pharmacy, wellness & fitness nutrition */
    { id: 'pharmeasy', name: 'Pharmeasy', url: 'https://pharmeasy.in/', category: 'health' },
    { id: 'netmeds', name: 'Netmeds', url: 'https://www.netmeds.com/', category: 'health' },
    { id: 'healthkart', name: 'HealthKart', url: 'https://www.healthkart.com/', category: 'health' },
    { id: 'apollo247', name: 'Apollo 247', url: 'https://www.apollo247.com/', category: 'health' },
    { id: 'medplus', name: 'MedPlus', url: 'https://www.medplusmart.com/', category: 'health' },
    { id: 'truemeds', name: 'Truemeds', url: 'https://www.truemeds.in/', category: 'health' },
    { id: 'muscleblaze', name: 'MuscleBlaze', url: 'https://www.muscleblaze.com/', category: 'health' },
    { id: 'practo', name: 'Practo', url: 'https://www.practo.com/', category: 'health' },

    /* Home — furniture, decor & mattresses */
    { id: 'pepperfry', name: 'Pepperfry', url: 'https://www.pepperfry.com/', category: 'home' },
    { id: 'urbanladder', name: 'Urban Ladder', url: 'https://www.urbanladder.com/', category: 'home' },
    { id: 'ikea', name: 'IKEA India', url: 'https://www.ikea.com/in/en/', category: 'home' },
    { id: 'wakefit', name: 'Wakefit', url: 'https://www.wakefit.co/', category: 'home' },
    { id: 'homecentre', name: 'Home Centre', url: 'https://www.homecentre.in/', category: 'home' },
    { id: 'duroflex', name: 'Duroflex', url: 'https://www.duroflexworld.com/', category: 'home' },
    { id: 'livspace', name: 'Livspace', url: 'https://www.livspace.com/in', category: 'home' },
    { id: 'nilkamal', name: 'Nilkamal', url: 'https://nilkamalfurniture.com/', category: 'home' },

    /* Jewelry — gold, diamond & fashion jewelry */
    { id: 'tanishq', name: 'Tanishq', url: 'https://www.tanishq.co.in/', category: 'jewelry' },
    { id: 'caratlane', name: 'CaratLane', url: 'https://www.caratlane.com/', category: 'jewelry' },
    { id: 'giva', name: 'GIVA', url: 'https://www.giva.co/', category: 'jewelry' },
    { id: 'candere', name: 'Candere', url: 'https://www.candere.com/', category: 'jewelry' },
    { id: 'bluestone', name: 'BlueStone', url: 'https://www.bluestone.com/', category: 'jewelry' },
    { id: 'melorra', name: 'Melorra', url: 'https://www.melorra.com/', category: 'jewelry' },
    { id: 'joyalukkas', name: 'Joyalukkas', url: 'https://www.joyalukkas.in/', category: 'jewelry' },

    /* Sports — activewear, footwear & fitness */
    { id: 'decathlon', name: 'Decathlon', url: 'https://www.decathlon.in/', category: 'sports' },
    { id: 'adidas', name: 'Adidas', url: 'https://www.adidas.co.in/', category: 'sports' },
    { id: 'nike', name: 'Nike', url: 'https://www.nike.com/in/', category: 'sports' },
    { id: 'cultfit', name: 'Cult.fit', url: 'https://www.cult.fit/', category: 'sports' },
    { id: 'puma', name: 'Puma', url: 'https://in.puma.com/', category: 'sports' },
    { id: 'reebok', name: 'Reebok', url: 'https://www.reebok.in/', category: 'sports' },
    { id: 'skechers', name: 'Skechers', url: 'https://www.skechers.in/', category: 'sports' },
    { id: 'underarmour', name: 'Under Armour', url: 'https://www.underarmour.co.in/', category: 'sports' },

    /* Kids — baby & children products */
    { id: 'firstcry', name: 'FirstCry', url: 'https://www.firstcry.com/', category: 'kids' },
    { id: 'hopscotch', name: 'Hopscotch', url: 'https://www.hopscotch.in/', category: 'kids' },
    { id: 'babyoye', name: 'Babyoye', url: 'https://www.babyoye.com/', category: 'kids' },
    { id: 'mothercare', name: 'Mothercare', url: 'https://www.mothercare.in/', category: 'kids' },
    { id: 'hamleys', name: 'Hamleys', url: 'https://www.hamleys.in/', category: 'kids' },

    /* Travel — flights, hotels & trip booking */
    { id: 'trawel', name: 'Trawel.in', url: 'https://www.trawel.in/', category: 'travel' },
    { id: 'makemytrip', name: 'MakeMyTrip', url: 'https://www.makemytrip.com/', category: 'travel' },
    { id: 'ixigo', name: 'Ixigo', url: 'https://www.ixigo.com/', category: 'travel' },
    { id: 'goibibo', name: 'Goibibo', url: 'https://www.goibibo.com/', category: 'travel' },
    { id: 'yatra', name: 'Yatra', url: 'https://www.yatra.com/', category: 'travel' },
    { id: 'cleartrip', name: 'Cleartrip', url: 'https://www.cleartrip.com/', category: 'travel' },
    { id: 'easemytrip', name: 'EaseMyTrip', url: 'https://www.easemytrip.com/', category: 'travel' },
    { id: 'irctc', name: 'IRCTC', url: 'https://www.irctc.co.in/', category: 'travel' },
    { id: 'airbnb', name: 'Airbnb', url: 'https://www.airbnb.co.in/', category: 'travel' },
    { id: 'booking', name: 'Booking.com', url: 'https://www.booking.com/', category: 'travel' },
    { id: 'indigo', name: 'IndiGo', url: 'https://www.goindigo.in/', category: 'travel' },
    { id: 'agoda', name: 'Agoda', url: 'https://www.agoda.com/en-in/', category: 'travel' },

    /* Entertainment — movies & streaming */
    { id: 'bookmyshow', name: 'BookMyShow', url: 'https://in.bookmyshow.com/', category: 'entertainment' },
    { id: 'hotstar', name: 'Disney+ Hotstar', url: 'https://www.hotstar.com/in/home', category: 'entertainment' },
    { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com/in/', category: 'entertainment' },
    { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/', category: 'entertainment' },
    { id: 'sonyliv', name: 'Sony LIV', url: 'https://www.sonyliv.com/', category: 'entertainment' },
    { id: 'zee5', name: 'ZEE5', url: 'https://www.zee5.com/', category: 'entertainment' }
  ];

  var sectionMap = {};
  SECTIONS.forEach(function (s) { sectionMap[s.id] = s; });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function logoSrc(store) {
    return '/image/shop/' + (store.logo || store.id + '.png');
  }

  function storeDomain(store) {
    try {
      return new URL(store.url).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function categoryLogo(id) {
    return '/image/shop/categories/' + id + '.svg';
  }

  function renderCategoryBadge(id, label, size) {
    var px = size || 52;
    return (
      '<span class="shop-cat-logo" aria-hidden="true">' +
        '<img src="' + categoryLogo(id) + '" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async">' +
      '</span>'
    );
  }

  function matchesQuery(store, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    var cat = sectionMap[store.category];
    return store.name.toLowerCase().indexOf(q) !== -1 ||
      (cat && cat.title.toLowerCase().indexOf(q) !== -1);
  }

  function storesInCategory(catId, query) {
    return STORES.filter(function (s) {
      return s.category === catId && matchesQuery(s, query);
    });
  }

  function renderTile(store) {
    var wordmark = store.logoType === 'wordmark';
    return (
      '<a class="shop-tile" href="' + escapeHtml(store.url) + '" target="_blank" rel="noopener noreferrer" title="Visit ' + escapeHtml(store.name) + '">' +
        '<span class="shop-tile-icon' + (wordmark ? ' shop-tile-icon--wordmark' : '') + '">' +
          '<img src="' + logoSrc(store) + '" alt="' + escapeHtml(store.name) + ' logo" width="' + (wordmark ? '54' : '52') + '" height="' + (wordmark ? '20' : '52') + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(storeDomain(store)) + '&amp;sz=128\'">' +
        '</span>' +
        '<span class="shop-tile-name">' + escapeHtml(store.name) + '</span>' +
      '</a>'
    );
  }

  function renderSection(section, query) {
    var stores = storesInCategory(section.id, query);
    if (!stores.length) return '';

    return (
      '<section class="shop-section reveal shop-section--' + section.id + '" id="shop-' + section.id + '" data-category="' + section.id + '">' +
        '<article class="shop-section-card">' +
          '<div class="shop-section-head">' +
            renderCategoryBadge(section.id) +
            '<div class="shop-section-meta">' +
              '<h2 class="shop-section-title">' + escapeHtml(section.title) + '</h2>' +
              '<p class="shop-section-sub">' + stores.length + ' curated stores</p>' +
            '</div>' +
          '</div>' +
          '<div class="shop-grid">' + stores.map(renderTile).join('') + '</div>' +
        '</article>' +
      '</section>'
    );
  }

  function renderSearchResults(query) {
    var stores = STORES.filter(function (s) { return matchesQuery(s, query); });
    if (!stores.length) return '';

    return (
      '<section class="shop-section reveal shop-section--search">' +
        '<article class="shop-section-card">' +
          '<div class="shop-section-head">' +
            renderCategoryBadge('search') +
            '<div class="shop-section-meta">' +
              '<h2 class="shop-section-title">Search results</h2>' +
              '<p class="shop-section-sub">' + stores.length + ' stores found</p>' +
            '</div>' +
          '</div>' +
          '<div class="shop-grid">' + stores.map(renderTile).join('') + '</div>' +
        '</article>' +
      '</section>'
    );
  }

  function renderAll(query, activeFilter) {
    if (query) return renderSearchResults(query);

    var html = '';
    var sections = activeFilter === 'all'
      ? SECTIONS
      : SECTIONS.filter(function (s) { return s.id === activeFilter; });

    sections.forEach(function (section) {
      html += renderSection(section, query);
    });
    return html;
  }

  function initReveal() {
    var els = document.querySelectorAll('.shop-section.reveal:not(.in-view)');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function init() {
    var root = document.getElementById('shop-sections');
    var searchInput = document.getElementById('shop-search');
    var filterBar = document.getElementById('shop-filters');
    var emptyState = document.getElementById('shop-empty');
    if (!root || !filterBar) return;

    var activeFilter = 'all';
    var query = '';

    function paint() {
      root.innerHTML = renderAll(query, activeFilter);
      var hasResults = !!root.querySelector('.shop-section');
      if (emptyState) emptyState.hidden = hasResults;
      initReveal();
    }

    var filters = [{ id: 'all', label: 'All' }].concat(
      SECTIONS.map(function (s) { return { id: s.id, label: s.title }; })
    );

    filters.forEach(function (filter) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-filter-chip' + (filter.id === activeFilter ? ' is-active' : '');
      btn.textContent = filter.label;
      btn.dataset.filter = filter.id;
      btn.addEventListener('click', function () {
        activeFilter = filter.id;
        if (searchInput) searchInput.value = '';
        query = '';
        filterBar.querySelectorAll('.shop-filter-chip').forEach(function (chip) {
          chip.classList.toggle('is-active', chip.dataset.filter === activeFilter);
        });
        paint();
        if (activeFilter !== 'all') {
          var target = document.getElementById('shop-' + activeFilter);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      filterBar.appendChild(btn);
    });

    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          query = searchInput.value.trim();
          if (query) {
            activeFilter = 'all';
            filterBar.querySelectorAll('.shop-filter-chip').forEach(function (chip) {
              chip.classList.toggle('is-active', chip.dataset.filter === 'all');
            });
          }
          paint();
        }, 160);
      });
    }

    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
