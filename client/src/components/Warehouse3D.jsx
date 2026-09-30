import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Warehouse3D({ products = [], currencySymbol = '₹', onSelectProduct }) {
  const mountRef = useRef(null);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate 900

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 10, 16);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(26, 26, 0x6366f1, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 3, 20);
    blueLight.position.set(-10, 6, -5);
    scene.add(blueLight);

    // Interactive Crates Group
    const bayGroup = new THREE.Group();
    scene.add(bayGroup);

    const interactiveMeshes = [];
    const cols = 6;
    const spacingX = 3.2;
    const spacingZ = 3.4;

    products.forEach((prod, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const posX = (col - (cols - 1) / 2) * spacingX;
      const posZ = (row - 1) * spacingZ;

      // Pallet base
      const palletGeo = new THREE.BoxGeometry(2.2, 0.2, 2.2);
      const palletMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
      const pallet = new THREE.Mesh(palletGeo, palletMat);
      pallet.position.set(posX, 0.1, posZ);
      pallet.receiveShadow = true;
      bayGroup.add(pallet);

      // Crate Stack height based on stock
      const stock = prod.stock_quantity;
      const isLowStock = stock <= prod.low_stock_threshold && stock > 0;
      const isOutOfStock = stock === 0;

      let color = 0x10b981; // Emerald for normal stock
      if (isLowStock) color = 0xf59e0b; // Amber
      if (isOutOfStock) color = 0xef4444; // Red

      const stackHeight = isOutOfStock ? 0.3 : Math.min(3.2, Math.max(0.6, (stock / 30) * 2.8));
      const crateGeo = new THREE.BoxGeometry(1.8, stackHeight, 1.8);
      const crateMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.3,
        transparent: isOutOfStock,
        opacity: isOutOfStock ? 0.45 : 0.95,
      });

      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(posX, 0.2 + stackHeight / 2, posZ);
      crate.castShadow = true;
      crate.receiveShadow = true;
      crate.userData = { product: prod, initialY: 0.2 + stackHeight / 2 };

      bayGroup.add(crate);
      interactiveMeshes.push(crate);

      // Warning marker if low stock or out of stock
      if (isLowStock || isOutOfStock) {
        const beaconGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: isOutOfStock ? 0xef4444 : 0xfbbf24,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(posX, 0.2 + stackHeight + 0.4, posZ);
        beacon.rotation.x = Math.PI;
        bayGroup.add(beacon);
      }
    });

    // Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -(((event.clientY - rect.top) / height) * 2 - 1);

      setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        setHoveredProduct(hit.userData.product);
        container.style.cursor = 'pointer';
      } else {
        setHoveredProduct(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);
      if (intersects.length > 0 && onSelectProduct) {
        onSelectProduct(intersects[0].object.userData.product);
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    // Mouse drag for camera orbit
    let isDragging = false;
    let prevMouseX = 0;
    let currentOrbitAngle = 0;

    const onMouseDown = (e) => {
      if (e.button === 0) {
        isDragging = true;
        prevMouseX = e.clientX;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onDragMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        prevMouseX = e.clientX;
        currentOrbitAngle += deltaX * 0.006;
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onDragMove);

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth camera orbit
      const radius = 17;
      camera.position.x = Math.sin(currentOrbitAngle) * radius;
      camera.position.z = Math.cos(currentOrbitAngle) * radius;
      camera.lookAt(0, 1.2, 0);

      // Subtle breathing animation on low stock items
      interactiveMeshes.forEach((mesh) => {
        if (mesh.userData.product.stock_quantity <= mesh.userData.product.low_stock_threshold) {
          mesh.scale.set(
            1 + Math.sin(time * 4) * 0.03,
            1 + Math.sin(time * 4) * 0.03,
            1 + Math.sin(time * 4) * 0.03
          );
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onDragMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [products, onSelectProduct]);

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-2xl">
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating 3D Warehouse HUD Overlay */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-xs flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          In Stock
        </span>
        <span className="flex items-center gap-1.5 text-amber-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          Low Stock Alert
        </span>
        <span className="flex items-center gap-1.5 text-rose-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
          Out of Stock
        </span>
        <span className="text-slate-400 border-l border-slate-700 pl-3">
          💡 Drag to rotate 3D view | Click crate to manage stock
        </span>
      </div>

      {/* Floating Raycast Tooltip */}
      {hoveredProduct && (
        <div
          className="pointer-events-none absolute z-20 bg-slate-900/95 backdrop-blur-lg border border-indigo-500/50 p-3.5 rounded-xl shadow-2xl text-xs text-white transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            minWidth: '200px',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{hoveredProduct.image_emoji}</span>
            <div>
              <p className="font-bold text-slate-100 line-clamp-1">{hoveredProduct.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{hoveredProduct.sku}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-[11px]">
            <div>
              <span className="text-slate-400">Stock:</span>{' '}
              <span
                className={`font-bold ${
                  hoveredProduct.stock_quantity === 0
                    ? 'text-rose-400'
                    : hoveredProduct.stock_quantity <= hoveredProduct.low_stock_threshold
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {hoveredProduct.stock_quantity} {hoveredProduct.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Price:</span>{' '}
              <span className="font-semibold text-slate-200">
                {currencySymbol}
                {hoveredProduct.selling_price}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Cost:</span>{' '}
              <span className="text-slate-300">
                {currencySymbol}
                {hoveredProduct.cost_price}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Category:</span>{' '}
              <span className="text-indigo-400 font-medium">{hoveredProduct.category}</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-indigo-300 text-center font-medium bg-indigo-950/60 py-1 rounded">
            Click crate to open quick restock
          </p>
        </div>
      )}
    </div>
  );
}
