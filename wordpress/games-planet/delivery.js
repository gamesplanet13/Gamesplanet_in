/* Product-page adapter for the existing prefill GPPostal lookup and ETA rules. */
(function(root){'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(form,product){
 if(!form)return;const input=form.elements.deliveryPin,note=document.getElementById('pincodeResult'),link=document.getElementById('pinEnquiry');let timer,version=0;
 note.setAttribute('aria-live','polite');
 function reset(){note.textContent='Enter your 6-digit PIN for city, state, distance and prepaid / COD delivery estimates.';link.hidden=true;}
 async function check(){const pin=input.value,token=++version;link.hidden=true;if(!/^[1-9]\d{5}$/.test(pin)){reset();return;}
 note.textContent='Checking delivery details…';
 try{if(!root.GPPostal)throw Error('Delivery lookup is unavailable. Please retry.');const result=await root.GPPostal.lookup(pin);if(token!==version||!form.isConnected||input.value!==pin)return;
 if(!result){note.textContent='PIN code not found. Check the number and try again.';return;}
 const d=result.delivery;note.innerHTML=`<span class="delivery-place"><strong>${escape(result.city)}, ${escape(result.state)}</strong> · ${escape(pin)}</span><span>From Rampur (244901) · Approx. distance: <strong>${escape(d.distance||'Unavailable')}</strong></span>${d.etaPrepaid?`<span class="delivery-prepaid"><strong>Prepaid: ${escape(d.etaPrepaid)}</strong><br>${escape(d.estimatedDelivery)}</span><span class="delivery-cod"><strong>COD: ${escape(d.etaCod)}</strong><br>${escape(d.estimatedDeliveryCod)}</span><small>Estimated working days; Sundays excluded. Distance is approximate straight-line distance. Courier serviceability and dispatch timing are confirmed before booking.</small>`:'<span>Delivery ETA is unavailable for this PIN. Ask Games Planet to confirm.</span>'}`;
 link.href='https://wa.me/917983624797?text='+encodeURIComponent(`Hello Games Planet, please confirm delivery for ${product.name} to PIN ${pin}, ${result.city}, ${result.state}. Approx. distance: ${d.distance||'unavailable'}. Prepaid: ${d.etaPrepaid||'unavailable'} (${d.estimatedDelivery||''}); COD: ${d.etaCod||'unavailable'} (${d.estimatedDeliveryCod||''}).`);link.hidden=false;
 }catch(error){if(token!==version||!form.isConnected)return;note.textContent='Delivery details could not load. Check your connection and press Check to retry.';}
 }
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6);++version;clearTimeout(timer);reset();if(input.value.length===6)timer=setTimeout(check,180);});
 form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);check();});
}
root.GPDelivery={mount};
})(window);
