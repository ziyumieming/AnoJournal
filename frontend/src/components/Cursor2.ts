// (�� meteorMouseEffect.ts �ļ�����)
interface MeteorParticle {
  // ����������չ
  id: number;
  x: number;
  y: number;
  vx: number; // ������X���ٶ�
  vy: number; // ������Y���ٶ�
  size: number;
  initialSize: number;
  opacity: number;
  life: number;
  initialLife: number;
  type: "tail" | "spark"; // ��������������
}

class MeteorMouseEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private areaElement: HTMLElement; // ��������¼�������

  private isActive = true;
  private animationFrameId: number | null = null; // �������洢����֡ID

  // �¼�������
  private boundHandleMouseMove = this.handleMouseMove.bind(this);
  private boundHandleMouseLeave = this.handleMouseLeave.bind(this);
  private boundHandleMouseEnter = this.handleMouseEnter.bind(this);
  private boundHandleClick = this.handleClick.bind(this);
  private boundResizeCanvas = this.resizeCanvas.bind(this);

  // --- ����ͷ������ ---
  private HEAD_CORE_SIZE_BASE = 2.5;
  // private HEAD_GLOW_COLOR_INNER = "rgba(255, 255, 240, 0.6)"; // ���ĻԹ���ɫ
  private HEAD_GLOW_COLOR_OUTER = "rgba(200, 220, 255, 0)"; // ���Թ�����͸������ɫ��
  // private HEAD_CORE_COLOR = "rgba(255, 255, 255, 1)";
  private HEAD_GLOW_SIZE_FACTOR = 4; // �Թ��С�Ǻ��Ĵ�С�ı���
  private HEAD_BRIGHTNESS_STATIONARY_FACTOR = 1.2; // ��ֹʱ��������
  private HEAD_BRIGHTNESS_MOVING_FACTOR = 2.0; // �ƶ�ʱ��������

  // --- ����β������ ---
  private TAIL_PARTICLE_INITIAL_SIZE_MIN = 1.8;
  private TAIL_PARTICLE_INITIAL_SIZE_MAX = 4.8;
  private TAIL_PARTICLE_LIFE_MIN = 25; // ֡ (Լ0.4s @ 60FPS)
  private TAIL_PARTICLE_LIFE_MAX = 50; // ֡ (Լ0.8s @ 60FPS)
  // private TAIL_PARTICLES_SPAWN_THRESHOLD_PX = 0.2; // ����ƶ��������زŲ�������
  private MAX_PARTICLES = 5000; // �����������
  private TAIL_OPACITY_BASE = 0.7;
  private MIN_DIST_FOR_ONE_TAIL_PARTICLE = 1; // ��������ƶ��������زŲ�����һ��β������
  private PIXELS_PER_ADDITIONAL_TAIL_PARTICLE = 2; // ÿ�����ƶ��������أ��ٶ����һ��β������
  private MAX_TAIL_PARTICLES_PER_FRAME_SPAWN = 10; // ÿ֡����������β�����ӣ���ֹ���ٻ���ʱ���ӹ��ࣩ

  // --- �����Ч������ ---
  private SPARK_ON_CLICK_COUNT = 200; // ���ʱ�����Ļ�����
  private SPARK_LIFE_MIN = 50; // ������������� (֡)
  private SPARK_LIFE_MAX = 200; // ����������� (֡)
  private SPARK_INITIAL_SIZE_MIN = 0.8;
  private SPARK_INITIAL_SIZE_MAX = 10;
  private SPARK_INITIAL_SPEED_MIN = 1.0;
  private SPARK_INITIAL_SPEED_MAX = 40;
  private SPARK_DRAG_FACTOR = 0.56; // ���ٶ�˥�����ӣ�ģ�����������
  private SPARK_OPACITY_BASE = 0.9;

  // --- ͷ����ҫЧ������ ---
  private HEAD_FLARE_DURATION_FRAMES = 8; // ͷ����ҫ����֡��
  private HEAD_FLARE_BRIGHTNESS_BOOST = 1.8; // ��ҫʱ������ǿ����
  private HEAD_FLARE_SIZE_BOOST = 1.3; // ��ҫʱ���Ĵ�С��ǿ����

  // --- ϵͳ״̬ ---
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
  private particles: MeteorParticle[] = []; // ������
  private particleIdCounter = 0;
  private STATIONARY_CHECK_INTERVAL_MS = 100; // ��ü��һ������Ƿ�ֹ
  private headFlareFramesRemaining = 0; // ���ڿ���ͷ����ҫЧ��

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

    // ��ʼ������ͷ��λ�õ���������
    this.mouse.x = this.canvas.width / 2;
    this.mouse.y = this.canvas.height / 2;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.head.x = this.mouse.x;
    this.head.y = this.mouse.y;

    // ���ݳ�ʼ isActive ״̬�����Ƿ���������
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
      ); // ��ѡ������"��ȼ"
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
      // ������
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.particles = []; // �������
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
    // ������뿪ʱ����������ͷ����β����ʧ����������ֹͣ
  }

  private handleMouseEnter(): void {
    // ��������ʱ�����ԡ���ȼ��ͷ��
    this.mouse.isMoving = true; // ������뼴Ϊ�ƶ��Ŀ�ʼ
    this.mouse.lastMoveTime = Date.now();
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isActive) {
      return;
    }
    // 1. ����ͷ����ҫЧ��
    this.headFlareFramesRemaining = this.HEAD_FLARE_DURATION_FRAMES;

    // 2. �ڵ��λ�ò���������
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
    const angle = Math.random() * Math.PI * 2; // �������Ƕ�

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
      type: "spark", // ���Ϊ������
    });
  }
  private update(): void {
    // return;
    // 1. ����ͷ��λ�� (����)
    this.head.x = this.mouse.x;
    this.head.y = this.mouse.y;

    // 2. �������Ƿ�ֹ (����)
    if (
      Date.now() - this.mouse.lastMoveTime >
      this.STATIONARY_CHECK_INTERVAL_MS
    ) {
      this.mouse.isMoving = false;
    }

    // 3. �����ƶ�״̬����ҫ״̬����ͷ����� (֮ǰ����ҫ�߼�����)
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

    // 4. β�����������߼� (�����޸Ĳ���)
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
        if (this.particles.length >= this.MAX_PARTICLES) break; // ���������������

        // �����Ӿ��ȷֲ�����һ֡λ�ú͵�ǰλ��֮��
        // t = 0 ��Ӧ prevX, prevY; t = 1 ��Ӧ mouse.x, mouse.y
        // ����ϣ�����Ӹ�����·���ġ��ɡ��˿�ʼ������ t ��һ����Сֵ��ʼ������
        const t =
          particlesToSpawnThisFrame > 1
            ? (i + 0.5) / particlesToSpawnThisFrame
            : 0.5; // ʹ���ӷֲ���С�ε��м�

        const spawnX = this.mouse.prevX + (this.mouse.x - this.mouse.prevX) * t;
        const spawnY = this.mouse.prevY + (this.mouse.y - this.mouse.prevY) * t;

        this.spawnTailParticle(spawnX, spawnY);
      }
    }
    // ʼ�ո�����һ֡�����λ��
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;

    // 5. ������������ (����β���ͻ�) - �˲����߼�����
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

      if (p.size < 0.1) p.size = 0.1; // ���⸺�����С
    }
  }

  private spawnTailParticle(x: number, y: number): void {
    // ע�����
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
      // �޸�Ϊ this.particles
      id,
      x,
      y,
      vx: 0, // β������ͨ����ֹ
      vy: 0,
      size: initialSize,
      initialSize,
      opacity:
        this.TAIL_OPACITY_BASE + Math.random() * (1 - this.TAIL_OPACITY_BASE),
      life,
      initialLife: life,
      type: "tail", // ��ȷ����
    });
  }
  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. ������������ (β���ͻ�)
    this.particles.forEach((p) => {
      // �޸�Ϊ this.particles
      if (p.size <= 0.1) return;

      let particleColorOpacity = p.opacity;
      // �𻨿�����΢��һ�����ͷ����ҫӰ��Сһ��
      if (p.type === "spark") {
        particleColorOpacity = p.opacity * 0.9; // �𻨿�����΢����ô��ͷ����������Ӱ��
      } else {
        particleColorOpacity = p.opacity * this.head.brightnessFactor; // β����ͷ������Ӱ��
      }

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(
        0,
        Math.min(1, particleColorOpacity)
      )})`;
      this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 2. ��������ͷ�� (ͷ����ҫ�߼�����update�е�����coreSize��brightnessFactor)
    // (����ͷ���Ĵ���������䣬����ʹ�� this.head.coreSize �� this.head.brightnessFactor �ĵ�ǰֵ)
    const currentGlowSize = this.head.glowSize * this.head.brightnessFactor; // �Թ�Ҳ����������Ӱ��
    if (currentGlowSize > 0.5) {
      const glowGradient = this.ctx.createRadialGradient(
        this.head.x,
        this.head.y,
        this.head.coreSize *
        0.3 *
        (this.headFlareFramesRemaining > 0 ? this.HEAD_FLARE_SIZE_BOOST : 1), // ��ҫʱ�ڲ��Թ�Ҳ���
        this.head.x,
        this.head.y,
        currentGlowSize
      );
      // ʹ��sin��������ҫ����Ȼ
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

    const currentCoreSize = this.head.coreSize; // coreSize����update�б�flare����
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
    // �����ǰʵ�����Ǽ���״̬����ִ���κβ�����ֹͣ����ѭ��
    if (!this.isActive) {
      this.animationFrameId = null; // ȷ��ID�����
      return;
    }
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  public destroy(): void {
    this.isActive = false; // ���Ϊ�ǻ
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


// DOM������Ϻ��ʼ��
// document.addEventListener("DOMContentLoaded", () => {
//   try {
//     new MeteorMouseEffect("particleCanvas", "particleArea");
//   } catch (error) {
//     console.error("Failed to initialize MeteorMouseEffect:", error);
//     // ����ѡ�����������û���ʾ������Ϣ
//   }
// });


export default MeteorMouseEffect;