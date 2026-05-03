/* ═══════════════════════════════════════════
   API Configuration
═══════════════════════════════════════════ */
const API_URL = 'https://haj-store-production.up.railway.app';
function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}`);
    }
    
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
}

/* ═══════════════════════════════════════════
   بيانات المنتجات (Fallback)
═══════════════════════════════════════════ */
const allProducts = [
  { id:1, name:'Chiffon hijab with attached inner cap', price:'120', imgs:['jel8.jpg','jel3.jpg','jel4.jpg','jel5.jpg','jel6.jpg','jel7.jpg'] },
  { id:2, name:'FLOWERS HIJAB',  price:'180', imgs:['m2.jpg','m3.jpg','m4.jpg','m5.jpg','m6.jpg','m7.jpg'] },
  { id:3, name:'STAN HIJAB',     price:'299', imgs:['stan2.jpg','stan3.jpg','stan4.jpg','stan5.jpg','stan6.jpg','stan7.jpg'] },
  { id:4, name:'PASHAMIL HIJAB', price:'250', imgs:['p7.jpg','p2.jpg','p8.jpg','p3.jpg','p4.jpg','p5.jpg'] },
  { id:5, name:'MILT HIJAB',     price:'150', imgs:['c1.jpg','c2.jpg','c4.jpg','c3.jpg','c5.jpg','c6.jpg'] },
  { id:6, name:'TIGER HIJAB',    price:'200', imgs:['d1.jpg','d2.jpg','d3.jpg','d5.jpg','d7.jpg'] },
];

/* ═══════════════════════════════════════════
   بناء الصفحات
═══════════════════════════════════════════ */
async function buildNewCollection() {
  try {
    const data = await apiRequest('/products');
    if (data.products && data.products.length > 0) {
      const apiProducts = data.products.map(p => ({
        id: p._id || p.id,
        name: p.name,
        price: p.price.toString(),
        imgs: p.images
      }));
      renderProducts(apiProducts);
      return;
    }
  } catch (e) {
    console.log('API products failed, using local data');
  }
  renderProducts(allProducts);
}

async function buildBestSellers() {
  try {
    const data = await apiRequest('/products/bestsellers/list');
    if (data.products && data.products.length > 0) {
      const apiProducts = data.products.map(p => ({
        id: p._id || p.id,
        name: p.name,
        price: p.price.toString(),
        imgs: p.images
      }));
      renderBestSellers(apiProducts);
      return;
    }
  } catch (e) {
    console.log('API bestsellers failed, using local data');
  }
  renderBestSellers(allProducts.slice(0,3));
}

function renderBestSellers(products) {
  document.getElementById('best-sellers-container').innerHTML =
    products.map(p => `
      <div class="product-card" onclick="addToCartSimple('${p.name}','${p.price}','${p.imgs[0]}',event)">
        <img src="${p.imgs[0]}" alt="${p.name}"/>
        <p class="product-name">${p.name}</p>
        <p class="product-price">${p.price} EG</p>
      </div>
    `).join('');
}

function renderProducts(products) {
  document.getElementById('nc-products-container').innerHTML =
    products.map(p => `
      <div class="nc-card">
        <div class="nc-main-wrap">
          <img class="nc-main-img" id="img-product${p.id}" src="${p.imgs[0]}" alt="${p.name}"/>
        </div>
        <div class="nc-thumbs">
          ${p.imgs.map(img => `
            <img class="nc-thumb" src="${img}" onclick="changeMainImg('product${p.id}',this)" alt=""/>
          `).join('')}
        </div>
        <div class="nc-info">
          <h3 class="nc-name">${p.name}</h3>
          <p class="nc-price">${p.price} EG</p>
          <a class="nc-add-btn" onclick="addToCartDirect('img-product${p.id}','${p.name}','${p.price}',this)">
            Add to Cart
          </a>
        </div>
      </div>
    `).join('');
  document.querySelectorAll('.nc-card').forEach(card => {
    card.querySelector('.nc-thumb').classList.add('active');
  });
}

buildNewCollection();
buildBestSellers();

/* ═══════════════════════════════════════════
   Search
═══════════════════════════════════════════ */
function handleSearch(query) {
  const q = query.toLowerCase().trim();

  const main = document.getElementById('search-input');
  const nc   = document.getElementById('search-input-nc');
  if (main && main.value !== query) main.value = query;
  if (nc   && nc.value   !== query) nc.value   = query;

  if (q === '') {
    buildNewCollection();
    buildBestSellers();
    return;
  }

  const results = allProducts.filter(p =>
    p.name.toLowerCase().includes(q)
  );

  showPage('new-collection');

  if (results.length > 0) {
    renderProducts(results);
  } else {
    document.getElementById('nc-products-container').innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:#9e8e82;">
        <p style="font-size:48px;margin-bottom:16px;">🔍</p>
        <p style="font-size:18px;font-family:'Playfair Display',serif;color:#3a2e27;margin-bottom:8px;">
          No results for "${query}"
        </p>
        <p style="font-size:13px;">Try: Chiffon · Flowers · Stan · Pashamil · Milt · Tiger</p>
        <a onclick="clearSearch()"
           style="display:inline-block;margin-top:20px;background:#3a2e27;color:#fff;
                  padding:10px 28px;border-radius:20px;cursor:pointer;font-size:13px;">
          Show All Products
        </a>
      </div>
    `;
  }
}

function clearSearch() {
  document.getElementById('search-input').value    = '';
  document.getElementById('search-input-nc').value = '';
  buildNewCollection();
}

/* ═══════════════════════════════════════════
   Navigation
═══════════════════════════════════════════ */
function showPage(page) {
  ['main-page','checkout-page','new-collection-page','account-page','success-page']
    .forEach(id => document.getElementById(id).style.display = 'none');
  const map = {
    'main':           'main-page',
    'checkout':       'checkout-page',
    'new-collection': 'new-collection-page',
    'account':        'account-page',
    'success':        'success-page'
  };
  document.getElementById(map[page]).style.display = 'block';
  window.scrollTo(0,0);
}

/* ═══════════════════════════════════════════
   AUTH (معدّل يكلّم الباك إند)
═══════════════════════════════════════════ */
let currentUser = null;

function openAuth()   { document.getElementById('auth-overlay').style.display = 'flex'; }
function closeAuth()  { document.getElementById('auth-overlay').style.display = 'none'; }

function switchTab(tab) {
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

async function signup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const err   = document.getElementById('signup-error');
  
  if (!name || !email || !pass) { err.innerText = 'Please fill all fields.'; return; }
  if (pass.length < 6) { err.innerText = 'Password must be 6+ characters.'; return; }
  
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass })
    });
    
    localStorage.setItem('token', data.token);
    loginUser(data.user);
    closeAuth();
    err.innerText = '';
  } catch (e) {
    err.innerText = e.message || 'Registration failed';
  }
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-error');
  
  if (!email || !pass) { err.innerText = 'Please fill all fields.'; return; }
  
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    
    localStorage.setItem('token', data.token);
    loginUser(data.user);
    closeAuth();
    err.innerText = '';
  } catch (e) {
    err.innerText = e.message || 'Wrong email or password.';
  }
}

function loginUser(user) {
  currentUser = user;
  document.getElementById('nav-account-label').innerText = user.name.split(' ')[0];
  if (user.address) document.getElementById('customer-address').value = user.address;
  if (user.address) document.getElementById('saved-address').value = user.address;
}

function logout() {
  currentUser = null;
  localStorage.removeItem('token');
  document.getElementById('nav-account-label').innerText = 'Login';
  showPage('main');
}

function handleAccountClick() {
  if (currentUser) { loadAccountPage(); showPage('account'); }
  else { openAuth(); }
}

async function loadAccountPage() {
  if (!currentUser) return;
  
  try {
    const data = await apiRequest('/auth/me');
    const user = data.user;
    currentUser = user;
    
    document.getElementById('account-name-display').innerText  = '👤 ' + user.name;
    document.getElementById('account-email-display').innerText = '📧 ' + user.email;
    document.getElementById('saved-address').value = user.address || '';
    
    const orders = user.orders || [];
    document.getElementById('orders-list').innerHTML = orders.length === 0
      ? '<p style="color:#9e8e82;font-size:13px;">No orders yet.</p>'
      : orders.map(o => `
          <div class="order-item">
            <p class="order-date">${new Date(o.createdAt).toLocaleDateString()}</p>
            <p class="order-items-text">${o.items ? o.items.map(i => i.name).join(', ') : ''}</p>
            <p class="order-total">${o.totalAmount} EG</p>
          </div>`).join('');
  } catch (e) {
    console.error('Failed to load account:', e);
  }
}

async function saveAddress() {
  if (!currentUser) return;
  const addr = document.getElementById('saved-address').value.trim();
  
  try {
    await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ address: addr })
    });
    currentUser.address = addr;
    document.getElementById('customer-address').value = addr;
    alert('Address saved! ✅');
  } catch (e) {
    alert('Failed to save address');
  }
}

async function checkAuth() {
  const token = getToken();
  if (!token) return;
  
  try {
    const data = await apiRequest('/auth/me');
    loginUser(data.user);
  } catch (e) {
    localStorage.removeItem('token');
  }
}

checkAuth();

/* ═══════════════════════════════════════════
   Cart
═══════════════════════════════════════════ */
let cart = [];

function updateCart() {
  document.getElementById('cart-count').innerText    = cart.length;
  document.getElementById('cart-count-nc').innerText = cart.length;
  if (cart.length === 0) {
    document.getElementById('cart-items').innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    document.getElementById('cart-total').innerText = '0 EG';
    return;
  }
  let total = 0;
  document.getElementById('cart-items').innerHTML = cart.map((item,i) => {
    total += parseInt(item.price) * (item.quantity || 1);
    return `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}"/>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${item.price} EG ${item.quantity > 1 ? 'x' + item.quantity : ''}</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
      </div>`;
  }).join('');
  document.getElementById('cart-total').innerText = total + ' EG';
}

function addToCartSimple(name, price, img, e) {
  cart.push({ name, price, img, quantity: 1 });
  updateCart();
  e.currentTarget.style.opacity = '0.6';
  setTimeout(() => e.currentTarget.style.opacity = '1', 400);
}

function addToCartDirect(imgId, name, price, btn) {
  const card        = document.getElementById(imgId).closest('.nc-card');
  const activeThumb = card.querySelector('.nc-thumb.active');
  const img         = activeThumb ? activeThumb.src : document.getElementById(imgId).src;
  cart.push({ name, price, img, quantity: 1 });
  updateCart();
  btn.innerText = '✓ Added!';
  btn.style.background    = '#c9a87c';
  btn.style.pointerEvents = 'none';
  setTimeout(() => {
    btn.innerText           = 'Add to Cart';
    btn.style.background    = '#3a2e27';
    btn.style.pointerEvents = 'auto';
  }, 1200);
}

function removeFromCart(i) { cart.splice(i,1); updateCart(); }
function openCart()  { document.getElementById('cart').style.display = 'flex'; }
function closeCart() { document.getElementById('cart').style.display = 'none'; }

/* ═══════════════════════════════════════════
   Checkout
═══════════════════════════════════════════ */
let selectedPayment = 'cash';

function selectPayment(method) {
  selectedPayment = method;
  document.getElementById('opt-whatsapp').classList.toggle('active', method === 'cash');
  document.getElementById('opt-visa').classList.toggle('active', method === 'visa');
  document.getElementById('visa-form').style.display = method === 'visa' ? 'block' : 'none';
}

function goToCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  let total = 0;
  document.getElementById('checkout-items').innerHTML = cart.map(item => {
    total += parseInt(item.price) * (item.quantity || 1);
    return `
      <div class="checkout-item">
        <img src="${item.img}" alt="${item.name}"/>
        <div>
          <p>${item.name}</p>
          <p style="color:#c9a87c;font-weight:600;">${item.price} EG</p>
        </div>
      </div>`;
  }).join('');
  
  document.getElementById('checkout-total-price').innerText = total + ' EG';
  
  if (currentUser) {
    document.getElementById('customer-name').value = currentUser.name || '';
    document.getElementById('customer-address').value = currentUser.address || '';
  }
  
  closeCart();
  showPage('checkout');
}

function goBack() {
  showPage('main');
}

async function submitOrder() {
  const name    = document.getElementById('customer-name').value.trim();
  const phone   = document.getElementById('customer-phone').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const notes   = document.getElementById('customer-notes').value.trim();
  
  if (!name || !phone || !address) {
    alert('Please fill all required fields');
    return;
  }
  
  if (!currentUser) {
    alert('Please login first');
    openAuth();
    return;
  }
  
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  const items = cart.map(item => ({
    name: item.name,
    price: parseInt(item.price),
    quantity: item.quantity || 1,
    image: item.img
  }));
  
  try {
    const data = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items,
        shippingInfo: { fullName: name, phone, address, notes },
        paymentMethod: selectedPayment
      })
    });
    
    cart = [];
    updateCart();
    
    document.getElementById('success-message').innerText = 
      `Order #${data.order.orderNumber} confirmed! We will contact you soon.`;
    showPage('success');
    
  } catch (e) {
    alert('Failed to place order: ' + (e.message || 'Unknown error'));
  }
}

/* ═══════════════════════════════════════════
   Thumbnails
═══════════════════════════════════════════ */
function changeMainImg(productId, thumbEl) {
  const imgEl = document.getElementById('img-' + productId);
  imgEl.classList.add('fade');
  setTimeout(() => { imgEl.src = thumbEl.src; imgEl.classList.remove('fade'); }, 200);
  thumbEl.closest('.nc-card').querySelectorAll('.nc-thumb')
    .forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

/* ═══════════════════════════════════════════
   Visa Format Helpers
═══════════════════════════════════════════ */
function formatCard(input) {
  let v = input.value.replace(/\D/g,'').substring(0,16);
  input.value = v.replace(/(.{4})/g,'$1 ').trim();
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g,'').substring(0,4);
  if (v.length >= 2) v = v.substring(0,2) + ' / ' + v.substring(2);
  input.value = v;
}