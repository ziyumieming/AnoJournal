


enum ParticleState {
  ORBITAL,   // 围绕静止的鼠标旋转
  SHRINKING, // 当鼠标开始移动时，从轨道收缩到鼠标位置
  TRAIL,     // 鼠标移动时留在路径上的痕迹
   DISPERSING_TO_ORBIT, // 新增：粒子从中心散开到轨道
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number; // 速度 x
  vy: number; // 速度 y
  opacity: number;
  life: number;
  initialLife: number;
  size: number;
  color: string;

  state: ParticleState;

  // ORBITAL 状态专属属性
  orbitalAnchorX?: number; // 轨道中心点 X
  orbitalAnchorY?: number; // 轨道中心点 Y
  orbitalAngle?: number;   // 当前轨道角度
  orbitalRadius?: number;  // 轨道半径
  orbitalSpeed?: number;   // 轨道旋转速度

  // DISPERSING_TO_ORBIT 状态的目标
  targetOrbitalX?: number; // 目标轨道X坐标
  targetOrbitalY?: number; // 目标轨道Y坐标
  isDispersingTargetSet?: boolean; // 标记是否已为此粒子设置了散开目标
}

class AdvancedParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private areaElement: HTMLElement;
  private particleIdCounter = 0;

  private mouse = { x: 0, y: 0, lastMoveTime: Date.now() };
  private stationaryAnchor = { x: 0, y: 0 };
  private isMouseStationary = false;

  // --- 配置参数 ---
  private PARTICLE_SIZE = 1;
  private PARTICLE_COLOR = 'rgba(255, 255, 255, 1)';
  
  private STATIONARY_THRESHOLD_MS = 150; // 鼠标静止多少毫秒后判定为静止
  
  private NUM_ORBITAL_PARTICLES = 60;    // 静止时环绕的粒子数量
  private ORBITAL_RADIUS_MIN = 20;       // 轨道最小半径
  private ORBITAL_RADIUS_MAX = 40;       // 轨道最大半径
  private ORBITAL_BASE_SPEED = 0.01;     // 基础旋转速度 (弧度/帧)
  private ORBITAL_SPEED_VARIATION = 0.02;

  private SHRINK_SPEED_FACTOR = 0.15;     // 收缩时向鼠标移动的速度因子 (0-1)
  private SHRINK_SNAP_DISTANCE = 5;      // 收缩时与鼠标多近时判定为到达
  private SHRINK_LIFE = 75;              // 收缩状态粒子的生命周期 (帧)

    private DISPERSE_SPEED_FACTOR = 0.08; // 散开到轨道槽的速度因子
  private DISPERSE_LIFE = 90;           // 散开动画的生命周期 (帧)
  private DISPERSE_SNAP_DISTANCE = 2;   // 散开时与目标多近则吸附过去

  private TRAIL_PARTICLES_PER_MOVE = 2; // 每次鼠标移动（帧）产生的轨迹粒子数
  private TRAIL_LIFE_MIN = 20;           // 轨迹粒子最短生命周期
  private TRAIL_LIFE_MAX = 50;           // 轨迹粒子最长生命周期
  // ---

  constructor(canvasId: string, areaId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.areaElement = document.getElementById(areaId) as HTMLElement;

    if (!this.canvas || !this.areaElement) throw new Error("Canvas or area element not found!");
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Failed to get 2D context.");
    this.ctx = ctx;

    this.resizeCanvas();
    this.initEventListeners();
    this.mouse.x = this.canvas.width / 2; // 初始鼠标位置
    this.mouse.y = this.canvas.height / 2;
    this.stationaryAnchor = { ...this.mouse };

    this.animate();
  }

  private resizeCanvas(): void {
    this.canvas.width = this.areaElement.offsetWidth;
    this.canvas.height = this.areaElement.offsetHeight;
  }

  private initEventListeners(): void {
    this.areaElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    // 当鼠标移出区域时，我们可能希望清除所有粒子或停止动画
    this.areaElement.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    this.mouse.lastMoveTime = Date.now();

    if (this.isMouseStationary) { // 如果之前是静止的，现在开始移动了
      this.isMouseStationary = false; // 将系统标记为“移动中”
      
      this.particles.forEach(p => {
        // 如果粒子之前是 ORBITAL 状态，或者正在 DISPERSING_TO_ORBIT（四散到轨道中）
        // 那么它现在应该立即切换到 SHRINKING 状态来跟随鼠标
        if (p.state === ParticleState.ORBITAL || p.state === ParticleState.DISPERSING_TO_ORBIT) {
          p.state = ParticleState.SHRINKING;
          p.life = this.SHRINK_LIFE; 
          p.initialLife = this.SHRINK_LIFE;
          
          // 重置任何特定于四散或轨道状态的目标，因为它们不再相关
          p.targetOrbitalX = undefined;
          p.targetOrbitalY = undefined;
          p.isDispersingTargetSet = false; 
          // p.orbitalAngle, p.orbitalRadius等轨道参数在SHRINKING状态下不需要
          // vx, vy 将在 updateParticles 方法中为 SHRINKING 状态动态计算
        }
      });
    }
    // 当鼠标持续移动时，spawnParticles 方法会根据 isMouseStationary 标志创建 TRAIL 粒子
  }
  
  private handleMouseLeave(): void {
    // 鼠标移出时，将所有粒子快速标记为消亡或转换为收缩状态
    this.isMouseStationary = false; // 确保不产生新的轨道粒子
     this.particles.forEach(p => {
        if (p.state === ParticleState.ORBITAL) {
            p.state = ParticleState.SHRINKING;
            p.life = this.SHRINK_LIFE / 2; // 加速消失
            p.initialLife = this.SHRINK_LIFE / 2;
        } else if (p.state === ParticleState.TRAIL) {
            p.life = Math.min(p.life, this.TRAIL_LIFE_MIN / 2); // 加速轨迹消失
        }
    });
    // 你也可以选择清空 this.particles 数组来立即移除所有粒子
    // this.particles = [];
  }


  private updateSystemState(): void {
    const now = Date.now();
    if (!this.isMouseStationary && (now - this.mouse.lastMoveTime > this.STATIONARY_THRESHOLD_MS)) {
      this.isMouseStationary = true;
      this.stationaryAnchor = { x: this.mouse.x, y: this.mouse.y };
      // 清理掉非ORBITAL的粒子，或者让它们自然消失
      // 这里选择让它们自然消失，新的ORBITAL粒子会按需创建

      // 选择现有粒子（主要是TRAIL或刚完成收缩的）进行散开
      // 我们优先选择那些生命周期较长（刚创建的）或者靠近当前鼠标位置的粒子
      const candidatesForDispersal = this.particles.filter(p => 
        p.state === ParticleState.TRAIL || 
        (p.state === ParticleState.SHRINKING && p.life > 0) // 包括仍在收缩过程中的粒子
      ).sort((a, b) => { // 简单排序：优先选择离鼠标近的
        const distA = Math.hypot(a.x - this.stationaryAnchor.x, a.y - this.stationaryAnchor.y);
        const distB = Math.hypot(b.x - this.stationaryAnchor.x, b.y - this.stationaryAnchor.y);
        return distA - distB;
      });
      
      let dispersedCount = this.particles.filter(p => p.state === ParticleState.ORBITAL || p.state === ParticleState.DISPERSING_TO_ORBIT).length;

      for (let i = 0; i < candidatesForDispersal.length && dispersedCount < this.NUM_ORBITAL_PARTICLES; i++) {
        const p = candidatesForDispersal[i];
        p.state = ParticleState.DISPERSING_TO_ORBIT;
        p.life = this.DISPERSE_LIFE;
        p.initialLife = this.DISPERSE_LIFE;
        p.vx = 0; // 重置速度，将根据目标计算
        p.vy = 0;
        p.isDispersingTargetSet = false; // 标记需要设置散开目标
        // 轨道参数将在 updateParticles 中为 DISPERSING_TO_ORBIT 状态的粒子设定目标时确定
        p.orbitalAnchorX = this.stationaryAnchor.x; // 轨道中心是当前静止点
        p.orbitalAnchorY = this.stationaryAnchor.y;
        p.orbitalSpeed = this.ORBITAL_BASE_SPEED + (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION; // 预设旋转速度
        dispersedCount++;
      }
    }
  }

  private spawnParticles(): void {
    if (this.isMouseStationary) {
      const orbitalAndDispersingCount = this.particles.filter(p =>
        p.state === ParticleState.ORBITAL || p.state === ParticleState.DISPERSING_TO_ORBIT
      ).length;

      if (orbitalAndDispersingCount < this.NUM_ORBITAL_PARTICLES) {
        for (let i = 0; i < this.NUM_ORBITAL_PARTICLES - orbitalAndDispersingCount; i++) {
          // 创建新的粒子，让它们从中心开始散开
          this.particles.push({
            id: this.particleIdCounter++,
            x: this.stationaryAnchor.x, // 从静止中心开始
            y: this.stationaryAnchor.y,
            vx: 0, vy: 0,
            opacity: 0.1, // 开始时可以略微透明
            life: this.DISPERSE_LIFE,
            initialLife: this.DISPERSE_LIFE,
            size: this.PARTICLE_SIZE,
            color: this.PARTICLE_COLOR,
            state: ParticleState.DISPERSING_TO_ORBIT,
            isDispersingTargetSet: false, // 将在updateParticles中设置目标
            orbitalAnchorX: this.stationaryAnchor.x,
            orbitalAnchorY: this.stationaryAnchor.y,
            orbitalSpeed: this.ORBITAL_BASE_SPEED + (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION,
          });
        }
      }
    } else { // 鼠标正在移动
      for (let i = 0; i < this.TRAIL_PARTICLES_PER_MOVE; i++) {
        const life = this.TRAIL_LIFE_MIN + Math.random() * (this.TRAIL_LIFE_MAX - this.TRAIL_LIFE_MIN);
        this.particles.push({
          id: this.particleIdCounter++,
          x: this.mouse.x + (Math.random() - 0.5) * 5,
          y: this.mouse.y + (Math.random() - 0.5) * 5,
          vx: 0, vy: 0,
          opacity: 1,
          life: life,
          initialLife: life,
          size: this.PARTICLE_SIZE,
          color: this.PARTICLE_COLOR,
          state: ParticleState.TRAIL,
        });
      }
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.state !== ParticleState.ORBITAL || p.life !== Infinity) { // ORBITAL且life为Infinity的粒子不主动减life
          p.life--;
      }
      
      if (p.life <= 0 && p.state !== ParticleState.ORBITAL) {
        this.particles.splice(i, 1);
        continue;
      }

      switch (p.state) {
        case ParticleState.ORBITAL:
          if (p.orbitalAnchorX !== undefined && p.orbitalAnchorY !== undefined && p.orbitalAngle !== undefined && p.orbitalSpeed !== undefined && p.orbitalRadius !== undefined) {
            p.orbitalAngle += p.orbitalSpeed;
            p.x = p.orbitalAnchorX + Math.cos(p.orbitalAngle) * p.orbitalRadius;
            p.y = p.orbitalAnchorY + Math.sin(p.orbitalAngle) * p.orbitalRadius;
            p.opacity = 1;
          }
          break;

        case ParticleState.SHRINKING: // 粒子追赶鼠标
          const dx_shrink = this.mouse.x - p.x;
          const dy_shrink = this.mouse.y - p.y;
          const dist_shrink = Math.sqrt(dx_shrink * dx_shrink + dy_shrink * dy_shrink);

          if (dist_shrink < this.SHRINK_SNAP_DISTANCE || p.life <=0) {
            this.particles.splice(i, 1); // 到达或生命耗尽则移除
            continue;
          } else {
            // 使用因子控制速度，产生“追赶”效果
            p.vx = dx_shrink * this.SHRINK_SPEED_FACTOR;
            p.vy = dy_shrink * this.SHRINK_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
          }
          p.opacity = Math.max(0, (p.life / p.initialLife) * 0.9 + 0.1); // 追赶时保持一定可见度
          break;

        case ParticleState.DISPERSING_TO_ORBIT: // 新增：粒子散开到轨道
          if (!p.isDispersingTargetSet && p.orbitalAnchorX !== undefined && p.orbitalAnchorY !== undefined) {
            // 为该粒子在轨道上分配一个随机的目标位置
            p.orbitalAngle = Math.random() * Math.PI * 2; // 最终的轨道角度
            p.orbitalRadius = this.ORBITAL_RADIUS_MIN + Math.random() * (this.ORBITAL_RADIUS_MAX - this.ORBITAL_RADIUS_MIN); // 最终的轨道半径
            
            p.targetOrbitalX = p.orbitalAnchorX + Math.cos(p.orbitalAngle) * p.orbitalRadius;
            p.targetOrbitalY = p.orbitalAnchorY + Math.sin(p.orbitalAngle) * p.orbitalRadius;
            p.isDispersingTargetSet = true;
            p.opacity = Math.max(0.1, p.opacity); // 开始散开时确保可见
          }

          if (p.targetOrbitalX === undefined || p.targetOrbitalY === undefined || p.life <= 0) {
            // 如果没有目标或生命耗尽，则尝试直接转为ORBITAL或移除
             if(p.life > 0 && p.targetOrbitalX !== undefined && p.targetOrbitalY !== undefined){ // 如果还有生命，强行设置为轨道状态
                p.state = ParticleState.ORBITAL;
                p.x = p.targetOrbitalX; p.y = p.targetOrbitalY;
                p.life = Infinity; p.opacity = 1; p.vx = 0; p.vy = 0;
             } else {
                this.particles.splice(i, 1); 
             }
            continue;
          }

          const dx_disperse = p.targetOrbitalX - p.x;
          const dy_disperse = p.targetOrbitalY - p.y;
          const dist_disperse = Math.sqrt(dx_disperse * dx_disperse + dy_disperse * dy_disperse);

          if (dist_disperse < this.DISPERSE_SNAP_DISTANCE) {
            // 到达目标，转换到ORBITAL状态
            p.state = ParticleState.ORBITAL;
            p.x = p.targetOrbitalX; // 精确到位
            p.y = p.targetOrbitalY;
            // orbitalAngle, orbitalRadius, orbitalSpeed, orbitalAnchorX/Y 已在之前设置或继承
            p.life = Infinity; 
            p.opacity = 1;
            p.vx = 0; p.vy = 0;
          } else {
            // 向目标移动
            p.vx = dx_disperse * this.DISPERSE_SPEED_FACTOR;
            p.vy = dy_disperse * this.DISPERSE_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity = Math.max(0.1, (p.life / p.initialLife)); // 散开过程中保持可见
          }
          break;

        case ParticleState.TRAIL:
          p.opacity = Math.max(0, p.life / p.initialLife);
          if (p.opacity <= 0) { // 双重检查，尽管life <= 0 会先移除
             this.particles.splice(i, 1);
             continue;
          }
          break;
      }
    }
  }

  private drawParticles(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      //fillRect的x,y是左上角，为了让1px点更居中，可以稍微调整
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
  }

  private animate(): void {
    this.updateSystemState(); // 更新鼠标是否静止的状态
    this.spawnParticles();    // 根据状态创建新粒子
    this.updateParticles();   // 更新所有粒子的状态和位置
    this.drawParticles();     // 绘制粒子
    requestAnimationFrame(this.animate.bind(this));
  }
}

// DOM加载完毕后初始化
document.addEventListener('DOMContentLoaded', () => {
  try {
    new AdvancedParticleSystem('particleCanvas', 'particleArea');
  } catch (error) {
    console.error("Failed to initialize particle system:", error);
    const area = document.getElementById('particleArea');
    if (area) {
        area.innerHTML = `<p style="color:red; text-align:center; margin-top: 20px;">Error initializing particle effect. Check console.</p>`;
    }
  }
});