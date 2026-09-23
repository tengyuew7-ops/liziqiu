(() => {
  const secret = '20040914';
  const foods = [
    { id: 'hotpot', name: '火锅', emoji: '🍲', size: 105, light: '#ffe6ee', dark: '#ff8bad' },
    { id: 'bbq', name: '烤肉', emoji: '🥩', size: 94, light: '#fff0e8', dark: '#ffb08d' },
    { id: 'sushi', name: '日料', emoji: '🍣', size: 100, light: '#ffe9f0', dark: '#ff9fb7' },
    { id: 'malatang', name: '麻辣烫', emoji: '🌶️', size: 108, light: '#ffe4e7', dark: '#ff8490' },
    { id: 'shaokao', name: '烧烤', emoji: '🍢', size: 92, light: '#fff1df', dark: '#ffc17e' },
    { id: 'pizza', name: '披萨', emoji: '🍕', size: 102, light: '#fff3dc', dark: '#ffd174' },
    { id: 'noodles', name: '面 / 粉', emoji: '🍜', size: 99, light: '#ffefe2', dark: '#ffb979' },
    { id: 'fried-chicken', name: '炸鸡', emoji: '🍗', size: 106, light: '#fff0df', dark: '#ffc071' },
    { id: 'home-cooking', name: '家常菜', emoji: '🍚', size: 98, light: '#ecf5ed', dark: '#a9d6ae' },
    { id: 'burger', name: '汉堡', emoji: '🍔', size: 92, light: '#fff0df', dark: '#ffc17b' },
    { id: 'dessert', name: '甜品', emoji: '🍰', size: 103, light: '#ffe8f4', dark: '#f5a4cf' },
    { id: 'milk-tea', name: '奶茶', emoji: '🧋', size: 96, light: '#f9ebdf', dark: '#dcb596' },
  ];
  const appConfig = window.LIZIQIU_CONFIG || {};
  const form = document.getElementById('form');
  const card = document.getElementById('card');
  const input = document.getElementById('code');
  const progress = document.getElementById('progress');
  const message = document.getElementById('message');
  const stage = document.getElementById('stage');
  const loveIntro = document.getElementById('loveIntro');
  const foodPanel = document.getElementById('foodPanel');
  const foodHeading = document.getElementById('foodHeading');
  const bubbleGrid = document.getElementById('bubbleGrid');
  const choiceDock = document.getElementById('choiceDock');
  const chosenFood = document.getElementById('chosenFood');
  const nickname = document.getElementById('nickname');
  const confirmChoice = document.getElementById('confirmChoice');
  const changeChoice = document.getElementById('changeChoice');
  const saveMessage = document.getElementById('saveMessage');
  const choiceResult = document.getElementById('choiceResult');
  const resultEmoji = document.getElementById('resultEmoji');
  const resultTitle = document.getElementById('resultTitle');
  const resultCopy = document.getElementById('resultCopy');
  const pickAgain = document.getElementById('pickAgain');
  const backendNote = document.getElementById('backendNote');
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const localPreview = appConfig.demoMode === true || location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /(?:\?|&)demo=1(?:&|$)/.test(location.search);
  const apiEndpoint = (() => {
    if (typeof appConfig.cloudbaseApiUrl !== 'string' || !appConfig.cloudbaseApiUrl.trim()) return null;
    try {
      const endpoint = new URL(appConfig.cloudbaseApiUrl, location.href);
      return endpoint.protocol === 'https:' ? endpoint : null;
    } catch (error) {
      console.error('CloudBase API 地址无效', error);
      return null;
    }
  })();
  const backendConfigured = Boolean(apiEndpoint);
  let raf = 0;
  let pieces = [];
  let confettiHearts = null;
  let heartShapes = null;
  let introTimer = 0;
  let selectedFood = null;

  for (let i = 0; i < 8; i++) {
    const span = document.createElement('span');
    span.textContent = '♥';
    progress.append(span);
  }

  foods.forEach((food, index) => {
    const label = document.createElement('label');
    label.className = 'bubble-slot';
    label.style.setProperty('--bubble-size', food.size + 'px');
    label.style.setProperty('--float-time', (4.8 + index % 4 * .55) + 's');
    label.style.setProperty('--float-delay', (-index * .31) + 's');

    const radio = document.createElement('input');
    radio.className = 'bubble-radio';
    radio.type = 'radio';
    radio.name = 'food';
    radio.value = food.id;
    radio.setAttribute('aria-label', food.name);

    const bubble = document.createElement('span');
    bubble.className = 'food-bubble';
    bubble.style.setProperty('--bubble-light', food.light);
    bubble.style.setProperty('--bubble-dark', food.dark);

    const icon = document.createElement('span');
    icon.className = 'bubble-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = food.emoji;

    const name = document.createElement('span');
    name.className = 'bubble-name';
    name.textContent = food.name;

    bubble.append(icon, name);
    label.append(radio, bubble);
    bubbleGrid.append(label);
    radio.addEventListener('change', () => selectFood(food));
  });

  if (localPreview || !backendConfigured) {
    backendNote.hidden = false;
    backendNote.textContent = localPreview
      ? '当前是本地预览模式，记录只保存在这台设备。'
      : '选择界面已完成，后台记录服务正在连接中。';
  }

  function updateProgress() {
    const clean = input.value.replace(/\D/g, '').slice(0, 8);
    if (input.value !== clean) input.value = clean;
    [...progress.children].forEach((heart, index) => heart.classList.toggle('filled', index < clean.length));
    input.removeAttribute('aria-invalid');
    message.textContent = '';
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function sprinkle() {
    if (reduceMotion.matches) return;
    if (typeof window.confetti === 'function') {
      cancelAnimationFrame(raf);
      if (!heartShapes) {
        heartShapes = ['#f45b93', '#ff83ad', '#ffb2cf'].map(color =>
          window.confetti.shapeFromText({ text: '♥', color, fontFamily: 'Georgia', scalar: 2 })
        );
      }
      if (!confettiHearts) {
        confettiHearts = window.confetti.create(canvas, { resize: true, disableForReducedMotion: true });
      }
      confettiHearts({
        particleCount: 115,
        spread: 135,
        startVelocity: 35,
        gravity: .8,
        ticks: 230,
        origin: { y: .46 },
        shapes: heartShapes,
        scalar: 2,
      });
      return;
    }
    cancelAnimationFrame(raf);
    resizeCanvas();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const colors = ['#f45b93', '#ff83ad', '#ffb2cf', '#ffffff', '#d93d79'];
    pieces = Array.from({ length: Math.min(100, Math.round(w / 7)) }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7;
      return {
        x: w / 2, y: h * .46, vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 15 + Math.random() * 20,
        color: colors[i % colors.length],
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - .5) * .12,
        opacity: 1,
      };
    });
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      frame++;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= .991;
        p.vy += .09;
        p.rotation += p.spin;
        p.opacity = Math.max(0, 1 - frame / 190);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', 0, 0);
        ctx.restore();
      }
      if (frame < 190) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    }
    draw();
  }

  function createId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function getVisitorId() {
    const key = 'liziqiu-visitor-id';
    try {
      let value = localStorage.getItem(key);
      if (!value || !/^[a-z0-9-]{1,80}$/.test(value)) {
        value = createId();
        localStorage.setItem(key, value);
      }
      return value;
    } catch (error) {
      return createId();
    }
  }

  async function saveChoiceViaApi(record) {
    if (!apiEndpoint) throw new Error('CloudBase API 尚未配置');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(apiEndpoint.href, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error('服务端保存失败（' + response.status + '）');
      }
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('CloudBase 保存请求超时');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function recordChoice(food, displayName) {
    const record = {
      food_id: food.id,
      food: food.name,
      nickname: displayName,
      visitor_id: getVisitorId(),
      request_id: createId(),
      client_time: new Date().toISOString(),
      source: 'github-pages',
      page_version: '2.0',
    };

    if (localPreview) {
      const key = 'liziqiu-demo-choices';
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      saved.push(record);
      localStorage.setItem(key, JSON.stringify(saved.slice(-30)));
      await new Promise(resolve => setTimeout(resolve, 420));
      return;
    }

    await saveChoiceViaApi(record);
  }

  function selectFood(food) {
    selectedFood = food;
    chosenFood.textContent = food.emoji + ' ' + food.name;
    saveMessage.textContent = '';
    choiceDock.hidden = false;
    window.setTimeout(() => {
      choiceDock.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }, 40);
  }

  function clearSelection() {
    selectedFood = null;
    Array.from(bubbleGrid.querySelectorAll('input[name="food"]')).forEach(radio => { radio.checked = false; });
    choiceDock.hidden = true;
    saveMessage.textContent = '';
    foodHeading.focus({ preventScroll: true });
  }

  async function submitChoice() {
    if (!selectedFood || confirmChoice.disabled) return;
    const food = selectedFood;
    const displayName = nickname.value.trim().slice(0, 20);
    confirmChoice.disabled = true;
    confirmChoice.textContent = '正在送达…';
    saveMessage.textContent = '正在把你的选择装进粉色信封 ♡';

    try {
      await recordChoice(food, displayName);
      bubbleGrid.hidden = true;
      choiceDock.hidden = true;
      choiceResult.hidden = false;
      resultEmoji.textContent = food.emoji;
      resultTitle.textContent = '收到啦！今天就吃' + food.name;
      resultCopy.textContent = displayName ? displayName + ' 的选择已经记下啦 ♡' : '你的选择已经记下啦 ♡';
      resultTitle.focus({ preventScroll: true });
      sprinkle();
    } catch (error) {
      console.error('保存美食选择失败', error);
      saveMessage.textContent = backendConfigured
        ? '暂时没有送达，请检查网络后再试一次 ♡'
        : '后台记录服务还没连接，请先联系页面主人 ♡';
    } finally {
      confirmChoice.disabled = false;
      confirmChoice.textContent = '就吃这个 ♡';
    }
  }

  function showFoodPicker() {
    loveIntro.classList.add('leaving');
    window.setTimeout(() => {
      loveIntro.hidden = true;
      loveIntro.classList.remove('leaving');
      foodPanel.hidden = false;
      foodHeading.focus({ preventScroll: true });
    }, reduceMotion.matches ? 20 : 380);
  }

  function openSurprise() {
    input.blur();
    card.hidden = true;
    stage.classList.remove('active');
    loveIntro.hidden = false;
    foodPanel.hidden = true;
    void stage.offsetWidth;
    stage.classList.add('active');
    stage.setAttribute('aria-hidden', 'false');
    sprinkle();
    window.clearTimeout(introTimer);
    introTimer = window.setTimeout(showFoodPicker, reduceMotion.matches ? 180 : 1600);
  }

  input.addEventListener('input', updateProgress);
  input.addEventListener('paste', () => requestAnimationFrame(updateProgress));
  form.addEventListener('submit', event => {
    event.preventDefault();
    updateProgress();
    if (input.value.length !== 8) {
      message.textContent = '提示：是 8 位数字哦 ♡';
    } else if (input.value !== secret) {
      message.textContent = '再试一次，数字好像不对哦 ♡';
    } else {
      openSurprise();
      return;
    }
    input.setAttribute('aria-invalid', 'true');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    input.focus();
  });
  confirmChoice.addEventListener('click', submitChoice);
  changeChoice.addEventListener('click', clearSelection);
  pickAgain.addEventListener('click', () => {
    choiceResult.hidden = true;
    bubbleGrid.hidden = false;
    clearSelection();
  });
  window.addEventListener('resize', () => {
    if (stage.classList.contains('active') && !confettiHearts) resizeCanvas();
  });
})();
