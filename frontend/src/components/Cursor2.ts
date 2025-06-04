// (在 meteorMouseEffect.ts 文件顶部)
interface MeteorParticle {
  // 重命名并扩展
  id: number;
  x: number;
  y: number;
  vx: number; // 新增：X轴速度
  vy: number; // 新增：Y轴速度
  size: number;
  initialSize: number;
  opacity: number;
  life: number;
  initialLife: number;
  type: "tail" | "spark"; // 新增：粒子类型
}

class MeteorMouseEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private areaElement: HTMLElement; // 监听鼠标事件的区域

  private isActive = true;
  private animationFrameId: number | null = null; // 新增：存储动画帧ID

  // 事件绑定引用
  private boundHandleMouseMove = this.handleMouseMove.bind(this);
  private boundHandleMouseLeave = this.handleMouseLeave.bind(this);
  private boundHandleMouseEnter = this.handleMouseEnter.bind(this);
  private boundHandleClick = this.handleClick.bind(this);
  private boundResizeCanvas = this.resizeCanvas.bind(this);

  // --- 流星头部参数 ---
  private HEAD_CORE_SIZE_BASE = 2.5;
  // private HEAD_GLOW_COLOR_INNER = "rgba(255, 255, 240, 0.6)"; // 核心辉光颜色
  private HEAD_GLOW_COLOR_OUTER = "rgba(200, 220, 255, 0)"; // 外层辉光趋于透明和冷色调
  // private HEAD_CORE_COLOR = "rgba(255, 255, 255, 1)";
  private HEAD_GLOW_SIZE_FACTOR = 4; // 辉光大小是核心大小的倍数
  private HEAD_BRIGHTNESS_STATIONARY_FACTOR = 1.2; // 静止时亮度因子
  private HEAD_BRIGHTNESS_MOVING_FACTOR = 2.0; // 移动时亮度因子

  // --- 流星尾迹参数 ---
  private TAIL_PARTICLE_INITIAL_SIZE_MIN = 1.8;
  private TAIL_PARTICLE_INITIAL_SIZE_MAX = 4.8;
  private TAIL_PARTICLE_LIFE_MIN = 25; // 帧 (约0.4s @ 60FPS)
  private TAIL_PARTICLE_LIFE_MAX = 50; // 帧 (约0.8s @ 60FPS)
  // private TAIL_PARTICLES_SPAWN_THRESHOLD_PX = 0.2; // 鼠标移动多少像素才产生粒子
  private MAX_PARTICLES = 5000; // 最大粒子总数
  private TAIL_OPACITY_BASE = 0.7;
  private MIN_DIST_FOR_ONE_TAIL_PARTICLE = 1; // 鼠标至少移动多少像素才产生第一个尾迹粒子
  private PIXELS_PER_ADDITIONAL_TAIL_PARTICLE = 2; // 每额外移动多少像素，再多产生一个尾迹粒子
  private MAX_TAIL_PARTICLES_PER_FRAME_SPAWN = 10; // 每帧最多产生多少尾迹粒子（防止快速滑动时粒子过多）

  // --- 点击火花效果参数 ---
  private SPARK_ON_CLICK_COUNT = 200; // 点击时产生的火花数量
  private SPARK_LIFE_MIN = 50; // 火花最短生命周期 (帧)
  private SPARK_LIFE_MAX = 200; // 火花最长生命周期 (帧)
  private SPARK_INITIAL_SIZE_MIN = 0.8;
  private SPARK_INITIAL_SIZE_MAX = 10;
  private SPARK_INITIAL_SPEED_MIN = 1.0;
  private SPARK_INITIAL_SPEED_MAX = 40;
  private SPARK_DRAG_FACTOR = 0.56; // 火花速度衰减因子（模拟空气阻力）
  private SPARK_OPACITY_BASE = 0.9;

  // --- 头部闪耀效果参数 ---
  private HEAD_FLARE_DURATION_FRAMES = 8; // 头部闪耀持续帧数
  private HEAD_FLARE_BRIGHTNESS_BOOST = 1.8; // 闪耀时亮度增强倍数
  private HEAD_FLARE_SIZE_BOOST = 1.3; // 闪耀时核心大小增强倍数

  // --- 系统状态 ---
  private mouse = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    isMoving: false,
    lastMoveTime: Date.now(),
  };
  private head = {
    x: 0,
    y: 0,
    coreSize: this.HEAD_CORE_SIZE_BASE,
    glowSize: this.HEAD_CORE_SIZE_BASE * this.HEAD_GLOW_SIZE_FACTOR,
    brightnessFactor: this.HEAD_BRIGHTNESS_STATIONARY_FACTOR,
  };
  private particles: MeteorParticle[] = []; // 重命名
  private particleIdCounter = 0;
  private STATIONARY_CHECK_INTERVAL_MS = 100; // 多久检查一次鼠标是否静止
  private headFlareFramesRemaining = 0; // 用于控制头部闪耀效果

  constructor(canvasId: string, areaId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.areaElement = document.getElementById(areaId) as HTMLElement;

    if (!this.canvas || !this.areaElement) {
      console.error("Canvas or area element not found!");
      throw new Error("Required elements not found for MeteorMouseEffect.");
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get 2D rendering context!");
      throw new Error("Failed to get 2D context.");
    }
    this.ctx = ctx;

    this.resizeCanvas();
    this.initEventListeners();

    // 初始化鼠标和头部位置到画布中心
    this.mouse.x = this.canvas.width / 2;
    this.mouse.y = this.canvas.height / 2;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.head.x = this.mouse.x;
    this.head.y = this.mouse.y;

    // 根据初始 isActive 状态决定是否启动动画
    if (this.isActive) {
      this.initEventListeners();
      this.animate();
    }
  }

  private resizeCanvas(): void {
    this.canvas.width = this.areaElement.offsetWidth;
    this.canvas.height = this.areaElement.offsetHeight;
  }

  private initEventListeners(): void {
    if (this.isActive) {
      this.areaElement.addEventListener(
        "mousemove",
        this.handleMouseMove.bind(this)
      );
      this.areaElement.addEventListener(
        "mouseleave",
        this.handleMouseLeave.bind(this)
      );
      this.areaElement.addEventListener(
        "mouseenter",
        this.handleMouseEnter.bind(this)
      ); // 可选，用于"点燃"
      window.addEventListener("resize", this.resizeCanvas.bind(this));
      this.areaElement.addEventListener("click", this.handleClick.bind(this));
    }
  }

  private removeEventListeners(): void {
    this.areaElement.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.areaElement.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    this.areaElement.removeEventListener("mouseenter", this.boundHandleMouseEnter);
    window.removeEventListener("resize", this.boundResizeCanvas);
    this.areaElement.removeEventListener("click", this.boundHandleClick);
  }

  public setActive(active: boolean) {
    if (active === this.isActive) return;
    this.isActive = active;
    if (active) {
      this.initEventListeners();
      if (!this.animationFrameId) {
        this.animate();
      }
    } else {
      this.removeEventListeners();
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      // 清理画布
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.particles = []; // 清空粒子
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    this.mouse.isMoving = true;
    this.mouse.lastMoveTime = Date.now();
  }

  private handleMouseLeave(): void {
    this.mouse.isMoving = false;
    // 当鼠标离开时，可以逐渐让头部和尾部消失，或者立即停止
  }

  private handleMouseEnter(): void {
    // 当鼠标进入时，可以“点燃”头部
    this.mouse.isMoving = true; // 假设进入即为移动的开始
    this.mouse.lastMoveTime = Date.now();
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isActive) {
      return;
    }
    // 1. 触发头部闪耀效果
    this.headFlareFramesRemaining = this.HEAD_FLARE_DURATION_FRAMES;

    // 2. 在点击位置产生火花粒子
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    for (let i = 0; i < this.SPARK_ON_CLICK_COUNT; i++) {
      if (this.particles.length < this.MAX_PARTICLES) {
        this.spawnSparkParticle(clickX, clickY);
      }
    }
  }

  private spawnSparkParticle(x: number, y: number): void {
    const id = this.particleIdCounter++;
    const initialSize =
      this.SPARK_INITIAL_SIZE_MIN +
      Math.random() *
      (this.SPARK_INITIAL_SIZE_MAX - this.SPARK_INITIAL_SIZE_MIN);
    const life =
      this.SPARK_LIFE_MIN +
      Math.random() * (this.SPARK_LIFE_MAX - this.SPARK_LIFE_MIN);
    const speed =
      this.SPARK_INITIAL_SPEED_MIN +
      Math.random() *
      (this.SPARK_INITIAL_SPEED_MAX - this.SPARK_INITIAL_SPEED_MIN);
    const angle = Math.random() * Math.PI * 2; // 随机发射角度

    this.particles.push({
      id,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: initialSize,
      initialSize,
      opacity:
        this.SPARK_OPACITY_BASE + Math.random() * (1 - this.SPARK_OPACITY_BASE),
      life,
      initialLife: life,
      type: "spark", // 标记为火花粒子
    });
  }
  private update(): void {
    // return;
    // 1. 更新头部位置 (不变)
    this.head.x = this.mouse.x;
    this.head.y = this.mouse.y;

    // 2. 检测鼠标是否静止 (不变)
    if (
      Date.now() - this.mouse.lastMoveTime >
      this.STATIONARY_CHECK_INTERVAL_MS
    ) {
      this.mouse.isMoving = false;
    }

    // 3. 根据移动状态和闪耀状态调整头部外观 (之前的闪耀逻辑不变)
    let baseBrightness = this.HEAD_BRIGHTNESS_STATIONARY_FACTOR;
    let baseCoreSize = this.HEAD_CORE_SIZE_BASE * 0.8;

    if (this.mouse.isMoving) {
      baseBrightness = this.HEAD_BRIGHTNESS_MOVING_FACTOR;
      baseCoreSize = this.HEAD_CORE_SIZE_BASE;
    }

    if (this.headFlareFramesRemaining > 0) {
      const flareProgress =
        this.headFlareFramesRemaining / this.HEAD_FLARE_DURATION_FRAMES;
      this.head.brightnessFactor =
        baseBrightness *
        (1 +
          (this.HEAD_FLARE_BRIGHTNESS_BOOST - 1) *
          Math.sin(Math.PI * flareProgress));
      this.head.coreSize =
        baseCoreSize *
        (1 +
          (this.HEAD_FLARE_SIZE_BOOST - 1) * Math.sin(Math.PI * flareProgress));
      this.headFlareFramesRemaining--;
    } else {
      this.head.brightnessFactor = baseBrightness;
      this.head.coreSize = baseCoreSize;
    }
    this.head.glowSize = this.head.coreSize * this.HEAD_GLOW_SIZE_FACTOR;

    // 4. 尾迹粒子生成逻辑 (核心修改部分)
    const distMoved = Math.hypot(
      this.mouse.x - this.mouse.prevX,
      this.mouse.y - this.mouse.prevY
    );

    if (this.mouse.isMoving && distMoved > 0) {
      let particlesToSpawnThisFrame = 0;
      if (distMoved >= this.MIN_DIST_FOR_ONE_TAIL_PARTICLE) {
        particlesToSpawnThisFrame =
          1 +
          Math.floor(
            (distMoved - this.MIN_DIST_FOR_ONE_TAIL_PARTICLE) /
            this.PIXELS_PER_ADDITIONAL_TAIL_PARTICLE
          );
      }
      particlesToSpawnThisFrame = Math.min(
        particlesToSpawnThisFrame,
        this.MAX_TAIL_PARTICLES_PER_FRAME_SPAWN
      );

      for (let i = 0; i < particlesToSpawnThisFrame; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) break; // 检查总粒子数限制

        // 将粒子均匀分布在上一帧位置和当前位置之间
        // t = 0 对应 prevX, prevY; t = 1 对应 mouse.x, mouse.y
        // 我们希望粒子更靠近路径的“旧”端开始，所以 t 从一个较小值开始并递增
        const t =
          particlesToSpawnThisFrame > 1
            ? (i + 0.5) / particlesToSpawnThisFrame
            : 0.5; // 使粒子分布在小段的中间

        const spawnX = this.mouse.prevX + (this.mouse.x - this.mouse.prevX) * t;
        const spawnY = this.mouse.prevY + (this.mouse.y - this.mouse.prevY) * t;

        this.spawnTailParticle(spawnX, spawnY);
      }
    }
    // 始终更新上一帧的鼠标位置
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;

    // 5. 更新所有粒子 (包括尾迹和火花) - 此部分逻辑不变
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.initialLife;

      if (p.type === "tail") {
        p.opacity =
          lifeRatio *
          (this.TAIL_OPACITY_BASE +
            Math.random() * (1 - this.TAIL_OPACITY_BASE));
        p.size = p.initialSize * lifeRatio;
        p.vx = 0;
        p.vy = 0;
      } else if (p.type === "spark") {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= this.SPARK_DRAG_FACTOR;
        p.vy *= this.SPARK_DRAG_FACTOR;
        p.opacity =
          lifeRatio *
          (this.SPARK_OPACITY_BASE +
            Math.random() * (1 - this.SPARK_OPACITY_BASE));
        p.size = p.initialSize * (0.5 + lifeRatio * 0.5);
      }

      if (p.size < 0.1) p.size = 0.1; // 避免负数或过小
    }
  }

  private spawnTailParticle(x: number, y: number): void {
    // 注意参数
    const id = this.particleIdCounter++;
    const initialSize =
      this.TAIL_PARTICLE_INITIAL_SIZE_MIN +
      Math.random() *
      (this.TAIL_PARTICLE_INITIAL_SIZE_MAX -
        this.TAIL_PARTICLE_INITIAL_SIZE_MIN);
    const life =
      this.TAIL_PARTICLE_LIFE_MIN +
      Math.random() *
      (this.TAIL_PARTICLE_LIFE_MAX - this.TAIL_PARTICLE_LIFE_MIN);

    this.particles.push({
      // 修改为 this.particles
      id,
      x,
      y,
      vx: 0, // 尾迹粒子通常静止
      vy: 0,
      size: initialSize,
      initialSize,
      opacity:
        this.TAIL_OPACITY_BASE + Math.random() * (1 - this.TAIL_OPACITY_BASE),
      life,
      initialLife: life,
      type: "tail", // 明确类型
    });
  }
  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 绘制所有粒子 (尾迹和火花)
    this.particles.forEach((p) => {
      // 修改为 this.particles
      if (p.size <= 0.1) return;

      let particleColorOpacity = p.opacity;
      // 火花可以稍微亮一点或受头部闪耀影响小一点
      if (p.type === "spark") {
        particleColorOpacity = p.opacity * 0.9; // 火花可以略微不那么受头部整体亮度影响
      } else {
        particleColorOpacity = p.opacity * this.head.brightnessFactor; // 尾迹受头部亮度影响
      }

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(
        0,
        Math.min(1, particleColorOpacity)
      )})`;
      this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 2. 绘制流星头部 (头部闪耀逻辑已在update中调整了coreSize和brightnessFactor)
    // (绘制头部的代码基本不变，它会使用 this.head.coreSize 和 this.head.brightnessFactor 的当前值)
    const currentGlowSize = this.head.glowSize * this.head.brightnessFactor; // 辉光也受亮度因子影响
    if (currentGlowSize > 0.5) {
      const glowGradient = this.ctx.createRadialGradient(
        this.head.x,
        this.head.y,
        this.head.coreSize *
        0.3 *
        (this.headFlareFramesRemaining > 0 ? this.HEAD_FLARE_SIZE_BOOST : 1), // 闪耀时内部辉光也变大
        this.head.x,
        this.head.y,
        currentGlowSize
      );
      // 使用sin曲线让闪耀更自然
      const flareShineFactor =
        this.headFlareFramesRemaining > 0
          ? Math.sin(
            Math.PI *
            (this.headFlareFramesRemaining /
              this.HEAD_FLARE_DURATION_FRAMES)
          )
          : 0;

      glowGradient.addColorStop(
        0,
        `rgba(255, 255, 240, ${Math.min(
          0.8,
          (0.3 + flareShineFactor * 0.5) * this.head.brightnessFactor
        )})`
      );
      glowGradient.addColorStop(
        0.7,
        `rgba(220, 230, 255, ${Math.min(
          0.3,
          (0.1 + flareShineFactor * 0.2) * this.head.brightnessFactor
        )})`
      );
      glowGradient.addColorStop(1, this.HEAD_GLOW_COLOR_OUTER);

      this.ctx.beginPath();
      this.ctx.fillStyle = glowGradient;
      this.ctx.arc(this.head.x, this.head.y, currentGlowSize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const currentCoreSize = this.head.coreSize; // coreSize已在update中被flare调整
    if (currentCoreSize > 0.5) {
      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(
        1,
        this.head.brightnessFactor *
        (this.headFlareFramesRemaining > 0 ? 1.1 : 1)
      )})`;
      this.ctx.arc(
        this.head.x,
        this.head.y,
        currentCoreSize / 2,
        0,
        Math.PI * 2
      );
      this.ctx.shadowColor = `rgba(255, 255, 255, ${0.7 * this.head.brightnessFactor
        })`;
      this.ctx.shadowBlur =
        currentCoreSize * 1.5 * (this.headFlareFramesRemaining > 0 ? 1.2 : 1);
      this.ctx.fill();
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
    }
  }

  private animate(): void {
    // 如果当前实例不是激活状态，则不执行任何操作并停止动画循环
    if (!this.isActive) {
      this.animationFrameId = null; // 确保ID被清除
      return;
    }
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  public destroy(): void {
    this.isActive = false; // 标记为非活动
    this.removeEventListeners();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}


// DOM加载完毕后初始化
// document.addEventListener("DOMContentLoaded", () => {
//   try {
//     new MeteorMouseEffect("particleCanvas", "particleArea");
//   } catch (error) {
//     console.error("Failed to initialize MeteorMouseEffect:", error);
//     // 可以选择在这里向用户显示错误信息
//   }
// });


export default MeteorMouseEffect;