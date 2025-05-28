enum ParticleState {
  ORBITAL, // Χ�ƾ�ֹ�������ת
  SHRINKING, // ����꿪ʼ�ƶ�ʱ���ӹ�����������λ��
  TRAIL, // ����ƶ�ʱ����·���ϵĺۼ�
  DISPERSING_TO_ORBIT, // ���������Ӵ�����ɢ�������
  EVENT_SHRINKING, // Shrinking due to click, dblclick, or long-press start
  EXPLODING, // Diverging outwards after long-press release
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number; // �ٶ� x
  vy: number; // �ٶ� y
  opacity: number;
  life: number;
  initialLife: number;
  size: number;
  color: string;

  state: ParticleState;

  // ORBITAL ״̬ר������
  orbitalAnchorX?: number; // ������ĵ� X
  orbitalAnchorY?: number; // ������ĵ� Y
  orbitalAngle?: number; // ��ǰ����Ƕ�
  orbitalRadius?: number; // ����뾶
  orbitalSpeed?: number; // �����ת�ٶ�

  // DISPERSING_TO_ORBIT ״̬��Ŀ��
  targetOrbitalX?: number; // Ŀ����X����
  targetOrbitalY?: number; // Ŀ����Y����
  isDispersingTargetSet?: boolean; // ����Ƿ���Ϊ������������ɢ��Ŀ��

  // Properties for EVENT_SHRINKING
  eventShrinkTargetX?: number;
  eventShrinkTargetY?: number;
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

  private isActive = true;
  private animationFrameId: number | null = null; // �������洢����֡ID
  // �¼�������
  private boundHandleMouseMove = this.handleMouseMove.bind(this);
  private boundHandleMouseLeave = this.handleMouseLeave.bind(this);
  private boundHandleClick = this.handleClick.bind(this);
  private boundHandleDoubleClick = this.handleDoubleClick.bind(this);
  private boundHandleMouseDownForLongPress = this.handleMouseDownForLongPress.bind(this);
  private boundResizeCanvas = this.resizeCanvas.bind(this);

  // --- ���ò��� ---
  private PARTICLE_SIZE = 2;
  private PARTICLE_COLOR = "rgb(255, 255, 255)";

  private STATIONARY_THRESHOLD_MS = 150; // ��꾲ֹ���ٺ�����ж�Ϊ��ֹ

  private NUM_ORBITAL_PARTICLES = 60; // ��ֹʱ���Ƶ���������
  private ORBITAL_RADIUS_MIN = 20; // �����С�뾶
  private ORBITAL_RADIUS_MAX = 40; // ������뾶
  private ORBITAL_BASE_SPEED = 0.01; // ������ת�ٶ� (����/֡)
  private ORBITAL_SPEED_VARIATION = 0.02;

  private SHRINK_SPEED_FACTOR = 0.15; // ����ʱ������ƶ����ٶ����� (0-1)
  private SHRINK_SNAP_DISTANCE = 5; // ����ʱ�������ʱ�ж�Ϊ����
  private SHRINK_LIFE = 75; // ����״̬���ӵ��������� (֡)

  private DISPERSE_SPEED_FACTOR = 0.08; // ɢ��������۵��ٶ�����
  private DISPERSE_LIFE = 90; // ɢ���������������� (֡)
  private DISPERSE_SNAP_DISTANCE = 2; // ɢ��ʱ��Ŀ������������ȥ

  private TRAIL_PARTICLES_PER_MOVE = 2; // ÿ������ƶ���֡�������Ĺ켣������
  private TRAIL_LIFE_MIN = 20; // �켣���������������
  private TRAIL_LIFE_MAX = 50; // �켣�������������

  // --- Parameters for Click/Double-click ---
  private EVENT_SHRINK_LIFE_CLICK = 25; // Life for particles shrinking due to click/dblclick
  private EVENT_SHRINK_SPEED_FACTOR = 0.25; // Speed factor for this shrinking

  // --- Parameters for Long-press ---
  private LONG_PRESS_THRESHOLD_MS = 400; // Duration to qualify as a long press
  private LONG_PRESS_MAX_MOVE_THRESHOLD_PX = 10; // Max mouse movement to cancel long press detection
  private EVENT_SHRINK_LIFE_LONG_PRESS = 35; // Life for particles shrinking during long press detection

  private EXPLODE_BASE_SPEED = 0.8; // Base speed for exploding particles
  private EXPLODE_SPEED_BOOST_PER_100MS = 0.2; // Additional speed per 100ms of long press duration
  private EXPLODE_LIFE = 100; // Lifespan of exploding particles
  private EXPLODE_PARTICLE_COUNT_FACTOR = 1.5; // Multiply current interactive particles for explosion count
  // ---

  private clickInfo = {
    shrinkTargetX: 0,
    shrinkTargetY: 0,
  };

  private longPressInfo = {
    detectorTimerId: null, // Timer for detecting long press
    startTime: 0, // Timestamp of mousedown
    startX: 0, // Mousedown X
    startY: 0, // Mousedown Y
    isDetecting: false, // True while mouse is down and timer is running
    isActive: false, // True once long press threshold is met (while mouse is still down)
    duration: 0, // Actual duration of the active long press
    explosionCenterX: 0, // Center for explosion
    explosionCenterY: 0,
  };

  // To manage global event listeners for long press correctly
  private boundHandleMouseUpForLongPress: (event: MouseEvent) => void;
  private boundHandleMouseMoveForLongPress: (event: MouseEvent) => void;

  constructor(canvasId: string, areaId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.areaElement = document.getElementById(areaId) as HTMLElement;

    if (!this.canvas || !this.areaElement)
      throw new Error("Canvas or area element not found!");

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context.");
    this.ctx = ctx;

    this.resizeCanvas();
    this.initEventListeners();
    this.mouse.x = this.canvas.width / 2; // ��ʼ���λ��
    this.mouse.y = this.canvas.height / 2;
    this.stationaryAnchor = { ...this.mouse };
    this.boundHandleMouseUpForLongPress =
      this.handleMouseUpForLongPress.bind(this);
    this.boundHandleMouseMoveForLongPress =
      this.handleMouseMoveForLongPress.bind(this);
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
      // ������Ƴ�����ʱ�����ǿ���ϣ������������ӻ�ֹͣ����
      this.areaElement.addEventListener(
        "mouseleave",
        this.handleMouseLeave.bind(this)
      );
      window.addEventListener("resize", this.resizeCanvas.bind(this));

      // New listeners
      this.areaElement.addEventListener("click", this.handleClick.bind(this));
      this.areaElement.addEventListener(
        "dblclick",
        this.handleDoubleClick.bind(this)
      );
      this.areaElement.addEventListener(
        "mousedown",
        this.handleMouseDownForLongPress.bind(this)
      );
      // mouseup and mousemove for long-press are added/removed globally from handleMouseDownForLongPress
    }
  }

  private removeEventListeners(): void {
    this.areaElement.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.areaElement.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    window.removeEventListener("resize", this.boundResizeCanvas);
    this.areaElement.removeEventListener("click", this.boundHandleClick);
    this.areaElement.removeEventListener("dblclick", this.boundHandleDoubleClick);
    this.areaElement.removeEventListener("mousedown", this.boundHandleMouseDownForLongPress);
  }

  // �������������ڶ����л�
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
      // ��������ȷ����Ч����ʧ
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.particles = []; // �������
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    // this.mouse.lastMoveTime = Date.now();
    if (!this.longPressInfo.isActive) {
      const previousLastMoveTime = this.mouse.lastMoveTime;
      this.mouse.lastMoveTime = Date.now();
      if (this.isMouseStationary) {
        // ���֮ǰ�Ǿ�ֹ�ģ����ڿ�ʼ�ƶ���
        this.isMouseStationary = false; // ��ϵͳ���Ϊ���ƶ��С�

        this.particles.forEach((p) => {
          // �������֮ǰ�� ORBITAL ״̬���������� DISPERSING_TO_ORBIT����ɢ������У�
          // ��ô������Ӧ�������л��� SHRINKING ״̬���������
          if (
            p.state === ParticleState.ORBITAL ||
            p.state === ParticleState.DISPERSING_TO_ORBIT
          ) {
            if (
              p.state !== ParticleState.EVENT_SHRINKING &&
              p.state !== ParticleState.EXPLODING
            ) {
              // Don't override active event states
              p.state = ParticleState.SHRINKING;
              p.life = this.SHRINK_LIFE;
              p.initialLife = this.SHRINK_LIFE;

              // �����κ��ض�����ɢ����״̬��Ŀ�꣬��Ϊ���ǲ������
              p.targetOrbitalX = undefined;
              p.targetOrbitalY = undefined;
              p.isDispersingTargetSet = false;
              // p.orbitalAngle, p.orbitalRadius�ȹ��������SHRINKING״̬�²���Ҫ
              // vx, vy ���� updateParticles ������Ϊ SHRINKING ״̬��̬����
            }
          }
        });
      }
    }
    // ���������ƶ�ʱ��spawnParticles ��������� isMouseStationary ��־���� TRAIL ����
  }

  // --- Click and Double Click Handler ---
  private handleClickOrDoubleClick(
    event: MouseEvent,
    isDoubleClick: boolean
  ): void {
    // If a long press was active, click/dblclick might be suppressed or handled differently
    if (this.longPressInfo.isActive || this.longPressInfo.isDetecting) {
      // Potentially, a click during long press detection could cancel it,
      // or be ignored. For now, let's prioritize ongoing long press detection.
      if (!isDoubleClick && !this.longPressInfo.isActive) {
        // If just detecting, a quick click might cancel it
        this.cancelLongPress();
      }
      return;
    }

    this.clickInfo.shrinkTargetX = event.offsetX;
    this.clickInfo.shrinkTargetY = event.offsetY;
    this.isMouseStationary = false; // Force system to react, mouse might be actually stationary

    this.particles.forEach((p) => {
      // Affect most interactive particles
      if (
        p.state === ParticleState.ORBITAL ||
        p.state === ParticleState.DISPERSING_TO_ORBIT ||
        p.state === ParticleState.TRAIL || // Even make trails shrink
        p.state === ParticleState.SHRINKING
      ) {
        p.state = ParticleState.EVENT_SHRINKING;
        p.eventShrinkTargetX = this.clickInfo.shrinkTargetX;
        p.eventShrinkTargetY = this.clickInfo.shrinkTargetY;
        p.life = this.EVENT_SHRINK_LIFE_CLICK; // Short life to shrink
        p.initialLife = this.EVENT_SHRINK_LIFE_CLICK;
        // Opacity and velocity will be handled in updateParticles
      }
    });

    // After shrinking, particles are removed (due to short life).
    // The system will then naturally regenerate particles based on the current mouse state
    // (orbital if stationary at click point, or trail/shrinking if mouse moves away).
    // This provides the "continue into surround state" by fresh generation.
    // To make the regeneration point the click location if mouse is still:
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    this.mouse.lastMoveTime = Date.now() - (this.STATIONARY_THRESHOLD_MS + 10); // Trick to make it stationary
    this.updateSystemState(); // Force re-evaluation of stationary state
  }

  private handleClick(event: MouseEvent): void {
    // Standard click might be part of a dblclick sequence.
    // We handle distinct behavior if needed, or let dblclick override.
    // For now, let click and dblclick have the same particle effect.
    // A common pattern is to wait briefly on click to see if a dblclick follows.
    // For simplicity here, both trigger the same immediate effect.
    if (this.longPressInfo.isDetecting && !this.longPressInfo.isActive) {
      // A quick click usually means not a long press
      this.cancelLongPress();
    }
    this.handleClickOrDoubleClick(event, false);
  }

  private handleDoubleClick(event: MouseEvent): void {
    this.cancelLongPress(); // Dblclick definitely cancels any long press attempt
    this.handleClickOrDoubleClick(event, true);
  }

  // --- Long Press Handler Methods ---
  private handleMouseDownForLongPress(event: MouseEvent): void {
    if (event.button !== 0) return; // Only handle left mouse button

    this.longPressInfo.isDetecting = true;
    this.longPressInfo.isActive = false;
    this.longPressInfo.startTime = Date.now();
    this.longPressInfo.startX = event.offsetX;
    this.longPressInfo.startY = event.offsetY;
    this.longPressInfo.explosionCenterX = event.offsetX; // Store for potential explosion
    this.longPressInfo.explosionCenterY = event.offsetY;

    // Clear any previous timer
    if (this.longPressInfo.detectorTimerId) {
      clearTimeout(this.longPressInfo.detectorTimerId);
    }

    this.longPressInfo.detectorTimerId = setTimeout(() => {
      if (this.longPressInfo.isDetecting) {
        // Still valid (mouse hasn't moved away or up)
        this.longPressInfo.isActive = true; // Long press is now active
        this.isMouseStationary = false; // Ensure system knows something is happening

        // Trigger shrinking towards the initial mousedown point
        this.particles.forEach((p) => {
          if (
            p.state === ParticleState.ORBITAL ||
            p.state === ParticleState.DISPERSING_TO_ORBIT ||
            p.state === ParticleState.TRAIL ||
            p.state === ParticleState.SHRINKING
          ) {
            p.state = ParticleState.EVENT_SHRINKING;
            p.eventShrinkTargetX = this.longPressInfo.startX;
            p.eventShrinkTargetY = this.longPressInfo.startY;
            p.life = this.EVENT_SHRINK_LIFE_LONG_PRESS; // Give them time to shrink
            p.initialLife = this.EVENT_SHRINK_LIFE_LONG_PRESS;
          }
        });
      }
    }, this.LONG_PRESS_THRESHOLD_MS);

    window.addEventListener("mouseup", this.boundHandleMouseUpForLongPress, {
      once: true,
    }); // Listen globally, once
    window.addEventListener("mousemove", this.boundHandleMouseMoveForLongPress);
  }

  private handleMouseUpForLongPress(event: MouseEvent): void {
    if (event.button !== 0) return;

    if (this.longPressInfo.detectorTimerId) {
      clearTimeout(this.longPressInfo.detectorTimerId);
      this.longPressInfo.detectorTimerId = null;
    }

    if (this.longPressInfo.isActive) {
      // A long press was successfully completed
      this.longPressInfo.duration = Date.now() - this.longPressInfo.startTime;

      // Particles that were EVENT_SHRINKING (or already at center) now EXPLODE
      const particlesToExplode: Particle[] = [];
      this.particles = this.particles.filter((p) => {
        if (p.state === ParticleState.EVENT_SHRINKING) {
          particlesToExplode.push(p);
          return false; // Remove from main list, will re-add as EXPLODING
        }
        // Also consider particles that might have already reached the center and are idle
        // For simplicity, we only take those actively in EVENT_SHRINKING state.
        return true;
      });

      const explosionSpeed =
        this.EXPLODE_BASE_SPEED +
        Math.floor(this.longPressInfo.duration / 100) *
        this.EXPLODE_SPEED_BOOST_PER_100MS;

      // Determine number of exploding particles
      // Could be based on particlesToExplode.length or a fixed number, or factor of NUM_ORBITAL_PARTICLES
      // Let's make it based on how many were shrinking + add some more for effect
      const numToActuallyExplode = Math.max(
        particlesToExplode.length,
        Math.floor(this.NUM_ORBITAL_PARTICLES * 0.5)
      );

      for (let i = 0; i < numToActuallyExplode; i++) {
        const p =
          i < particlesToExplode.length
            ? particlesToExplode[i]
            : ({
              // Reuse or create new
              id: this.particleIdCounter++,
              size: this.PARTICLE_SIZE,
              color: this.PARTICLE_COLOR,
              // x, y, vx, vy will be set below
            } as Partial<Particle>); // Type assertion for creating new

        p.state = ParticleState.EXPLODING;
        p.x = this.longPressInfo.explosionCenterX; // Explode from the initial mousedown point
        p.y = this.longPressInfo.explosionCenterY;
        p.life = this.EXPLODE_LIFE;
        p.initialLife = this.EXPLODE_LIFE;

        const angle = Math.random() * Math.PI * 2;
        p.vx = Math.cos(angle) * explosionSpeed;
        p.vy = Math.sin(angle) * explosionSpeed;
        p.opacity = 1;

        this.particles.push(p as Particle);
      }

      // After explosion, the main particle system should regenerate normally.
      // Force mouse to be considered stationary at its current position to trigger regeneration.
      this.mouse.lastMoveTime =
        Date.now() - (this.STATIONARY_THRESHOLD_MS + 10);
      this.updateSystemState(); // Force re-evaluation for regeneration
    }

    this.cancelLongPressState(); // Clean up long press detection state
  }

  private handleMouseMoveForLongPress(event: MouseEvent): void {
    if (this.longPressInfo.isDetecting && !this.longPressInfo.isActive) {
      const dx =
        event.clientX -
        (this.areaElement.getBoundingClientRect().left +
          this.longPressInfo.startX);
      const dy =
        event.clientY -
        (this.areaElement.getBoundingClientRect().top +
          this.longPressInfo.startY);
      if (
        Math.sqrt(dx * dx + dy * dy) > this.LONG_PRESS_MAX_MOVE_THRESHOLD_PX
      ) {
        this.cancelLongPress();
      }
    }
  }

  private cancelLongPress(): void {
    if (this.longPressInfo.detectorTimerId) {
      clearTimeout(this.longPressInfo.detectorTimerId);
    }
    this.cancelLongPressState();
  }
  private cancelLongPressState(): void {
    this.longPressInfo.isDetecting = false;
    this.longPressInfo.isActive = false;
    this.longPressInfo.detectorTimerId = null;
    window.removeEventListener("mouseup", this.boundHandleMouseUpForLongPress);
    window.removeEventListener(
      "mousemove",
      this.boundHandleMouseMoveForLongPress
    );
  }

  private handleMouseLeave(): void {
    if (this.longPressInfo.isDetecting || this.longPressInfo.isActive) {
      this.cancelLongPress();
    }
    // ����Ƴ�ʱ�����������ӿ��ٱ��Ϊ������ת��Ϊ����״̬
    this.isMouseStationary = false; // ȷ���������µĹ������
    this.particles.forEach((p) => {
      if (p.state === ParticleState.ORBITAL) {
        p.state = ParticleState.SHRINKING;
        p.life = this.SHRINK_LIFE / 2; // ������ʧ
        p.initialLife = this.SHRINK_LIFE / 2;
      } else if (p.state === ParticleState.TRAIL) {
        p.life = Math.min(p.life, this.TRAIL_LIFE_MIN / 2); // ���ٹ켣��ʧ
      }
    });
    // ��Ҳ����ѡ����� this.particles �����������Ƴ���������
    // this.particles = [];
  }

  private updateSystemState(): void {
    const now = Date.now();
    // Mouse becomes stationary only if no long press is active and threshold is met
    if (
      !this.longPressInfo.isActive &&
      !this.isMouseStationary &&
      now - this.mouse.lastMoveTime > this.STATIONARY_THRESHOLD_MS
    ) {
      this.isMouseStationary = true;
      this.stationaryAnchor = { x: this.mouse.x, y: this.mouse.y };
      // ... (rest of the logic for transitioning TRAIL to DISPERSING if any - this part might need review)
      // The logic to convert TRAIL/SHRINKING to DISPERSING_TO_ORBIT should run here as before.
      const candidatesForDispersal = this.particles
        .filter(
          (p) =>
            p.state === ParticleState.TRAIL ||
            (p.state === ParticleState.SHRINKING && p.life > 0)
        )
        .sort((a, b) => {
          const distA = Math.hypot(
            a.x - this.stationaryAnchor.x,
            a.y - this.stationaryAnchor.y
          );
          const distB = Math.hypot(
            b.x - this.stationaryAnchor.x,
            b.y - this.stationaryAnchor.y
          );
          return distA - distB;
        });

      let dispersedCount = this.particles.filter(
        (p) =>
          p.state === ParticleState.ORBITAL ||
          p.state === ParticleState.DISPERSING_TO_ORBIT
      ).length;

      for (
        let i = 0;
        i < candidatesForDispersal.length &&
        dispersedCount < this.NUM_ORBITAL_PARTICLES;
        i++
      ) {
        const p = candidatesForDispersal[i];
        if (
          p.state !== ParticleState.EVENT_SHRINKING &&
          p.state !== ParticleState.EXPLODING
        ) {
          // Check again
          p.state = ParticleState.DISPERSING_TO_ORBIT;
          p.life = this.DISPERSE_LIFE;
          p.initialLife = this.DISPERSE_LIFE;
          p.vx = 0;
          p.vy = 0;
          p.isDispersingTargetSet = false;
          p.orbitalAnchorX = this.stationaryAnchor.x;
          p.orbitalAnchorY = this.stationaryAnchor.y;
          p.orbitalSpeed =
            this.ORBITAL_BASE_SPEED +
            (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION;
          dispersedCount++;
        }
      }
    } else if (this.longPressInfo.isActive && this.isMouseStationary) {
      // If long press became active, mouse should not be considered stationary for orbital generation
      this.isMouseStationary = false;
    }
  }

  private spawnParticles(): void {
    if (this.isMouseStationary) {
      const orbitalAndDispersingCount = this.particles.filter(
        (p) =>
          p.state === ParticleState.ORBITAL ||
          p.state === ParticleState.DISPERSING_TO_ORBIT
      ).length;

      if (orbitalAndDispersingCount < this.NUM_ORBITAL_PARTICLES) {
        for (
          let i = 0;
          i < this.NUM_ORBITAL_PARTICLES - orbitalAndDispersingCount;
          i++
        ) {
          // �����µ����ӣ������Ǵ����Ŀ�ʼɢ��
          this.particles.push({
            id: this.particleIdCounter++,
            x: this.stationaryAnchor.x, // �Ӿ�ֹ���Ŀ�ʼ
            y: this.stationaryAnchor.y,
            vx: 0,
            vy: 0,
            opacity: 0.1, // ��ʼʱ������΢͸��
            life: this.DISPERSE_LIFE,
            initialLife: this.DISPERSE_LIFE,
            size: this.PARTICLE_SIZE,
            color: this.PARTICLE_COLOR,
            state: ParticleState.DISPERSING_TO_ORBIT,
            isDispersingTargetSet: false, // ����updateParticles������Ŀ��
            orbitalAnchorX: this.stationaryAnchor.x,
            orbitalAnchorY: this.stationaryAnchor.y,
            orbitalSpeed:
              this.ORBITAL_BASE_SPEED +
              (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION,
          });
        }
      }
    } else {
      // ��������ƶ�
      for (let i = 0; i < this.TRAIL_PARTICLES_PER_MOVE; i++) {
        const life =
          this.TRAIL_LIFE_MIN +
          Math.random() * (this.TRAIL_LIFE_MAX - this.TRAIL_LIFE_MIN);
        this.particles.push({
          id: this.particleIdCounter++,
          x: this.mouse.x + (Math.random() - 0.5) * 5,
          y: this.mouse.y + (Math.random() - 0.5) * 5,
          vx: 0,
          vy: 0,
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

      // Life decrement for states that have it
      if (p.state !== ParticleState.ORBITAL || p.life !== Infinity) {
        if (p.state !== ParticleState.EXPLODING || p.life !== Infinity) {
          // Exploding also has life
          p.life--;
        }
      }

      if (p.life <= 0 && p.state !== ParticleState.ORBITAL) {
        this.particles.splice(i, 1);
        continue;
      }

      switch (p.state) {
        case ParticleState.ORBITAL:
          if (
            p.orbitalAnchorX !== undefined &&
            p.orbitalAnchorY !== undefined &&
            p.orbitalAngle !== undefined &&
            p.orbitalSpeed !== undefined &&
            p.orbitalRadius !== undefined
          ) {
            p.orbitalAngle += p.orbitalSpeed;
            p.x = p.orbitalAnchorX + Math.cos(p.orbitalAngle) * p.orbitalRadius;
            p.y = p.orbitalAnchorY + Math.sin(p.orbitalAngle) * p.orbitalRadius;
            p.opacity = 1;
          }
          break;

        case ParticleState.SHRINKING: // ����׷�����
          const dx_shrink = this.mouse.x - p.x;
          const dy_shrink = this.mouse.y - p.y;
          const dist_shrink = Math.sqrt(
            dx_shrink * dx_shrink + dy_shrink * dy_shrink
          );

          if (dist_shrink < this.SHRINK_SNAP_DISTANCE || p.life <= 0) {
            this.particles.splice(i, 1); // ����������ľ����Ƴ�
            continue;
          } else {
            // ʹ�����ӿ����ٶȣ�������׷�ϡ�Ч��
            p.vx = dx_shrink * this.SHRINK_SPEED_FACTOR;
            p.vy = dy_shrink * this.SHRINK_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
          }
          p.opacity = Math.max(0, (p.life / p.initialLife) * 0.9 + 0.1); // ׷��ʱ����һ���ɼ���
          break;

        case ParticleState.EVENT_SHRINKING: // Shrinking due to Click, DblClick, or LongPress Start
          if (
            p.eventShrinkTargetX === undefined ||
            p.eventShrinkTargetY === undefined
          ) {
            this.particles.splice(i, 1);
            continue; // Should have a target
          }
          const dx_event_shrink = p.eventShrinkTargetX - p.x;
          const dy_event_shrink = p.eventShrinkTargetY - p.y;
          const dist_event_shrink = Math.hypot(
            dx_event_shrink,
            dy_event_shrink
          );

          // If it's shrinking for a long press that became active, and mouseup happens, it will be transitioned to EXPLODING
          // So, this state primarily handles movement.
          if (dist_event_shrink < this.SHRINK_SNAP_DISTANCE || p.life <= 0) {
            // For click/dblclick, particle is removed, system regenerates.
            // For long press, if it's still active (mouse not up yet), it stays at center.
            // If long press just ended, it would have been switched to EXPLODING.
            if (!this.longPressInfo.isActive || p.life <= 0) {
              // If not an active long press or life ended
              this.particles.splice(i, 1);
            } else {
              // For active long press, hold at center
              p.x = p.eventShrinkTargetX;
              p.y = p.eventShrinkTargetY;
              p.vx = 0;
              p.vy = 0;
            }
            continue;
          } else {
            p.vx = dx_event_shrink * this.EVENT_SHRINK_SPEED_FACTOR;
            p.vy = dy_event_shrink * this.EVENT_SHRINK_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
          }
          p.opacity = Math.max(0.1, p.life / p.initialLife);
          break;

        case ParticleState.EXPLODING:
          p.x += p.vx;
          p.y += p.vy;
          // Optional: add some drag/friction to exploding particles
          // p.vx *= 0.99;
          // p.vy *= 0.99;
          p.opacity = Math.max(0, p.life / p.initialLife);
          // These particles ignore mouse movements. They are on a ballistic trajectory.
          if (p.opacity <= 0) {
            // Also check opacity if life isn't perfectly synced
            this.particles.splice(i, 1);
            continue;
          }
          break;

        case ParticleState.DISPERSING_TO_ORBIT: // ����������ɢ�������
          if (
            !p.isDispersingTargetSet &&
            p.orbitalAnchorX !== undefined &&
            p.orbitalAnchorY !== undefined
          ) {
            // Ϊ�������ڹ���Ϸ���һ�������Ŀ��λ��
            p.orbitalAngle = Math.random() * Math.PI * 2; // ���յĹ���Ƕ�
            p.orbitalRadius =
              this.ORBITAL_RADIUS_MIN +
              Math.random() *
              (this.ORBITAL_RADIUS_MAX - this.ORBITAL_RADIUS_MIN); // ���յĹ���뾶

            p.targetOrbitalX =
              p.orbitalAnchorX + Math.cos(p.orbitalAngle) * p.orbitalRadius;
            p.targetOrbitalY =
              p.orbitalAnchorY + Math.sin(p.orbitalAngle) * p.orbitalRadius;
            p.isDispersingTargetSet = true;
            p.opacity = Math.max(0.1, p.opacity); // ��ʼɢ��ʱȷ���ɼ�
          }

          if (
            p.targetOrbitalX === undefined ||
            p.targetOrbitalY === undefined ||
            p.life <= 0
          ) {
            // ���û��Ŀ��������ľ�������ֱ��תΪORBITAL���Ƴ�
            if (
              p.life > 0 &&
              p.targetOrbitalX !== undefined &&
              p.targetOrbitalY !== undefined
            ) {
              // �������������ǿ������Ϊ���״̬
              p.state = ParticleState.ORBITAL;
              p.x = p.targetOrbitalX;
              p.y = p.targetOrbitalY;
              p.life = Infinity;
              p.opacity = 1;
              p.vx = 0;
              p.vy = 0;
            } else {
              this.particles.splice(i, 1);
            }
            continue;
          }

          const dx_disperse = p.targetOrbitalX - p.x;
          const dy_disperse = p.targetOrbitalY - p.y;
          const dist_disperse = Math.sqrt(
            dx_disperse * dx_disperse + dy_disperse * dy_disperse
          );

          if (dist_disperse < this.DISPERSE_SNAP_DISTANCE) {
            // ����Ŀ�꣬ת����ORBITAL״̬
            p.state = ParticleState.ORBITAL;
            p.x = p.targetOrbitalX; // ��ȷ��λ
            p.y = p.targetOrbitalY;
            // orbitalAngle, orbitalRadius, orbitalSpeed, orbitalAnchorX/Y ����֮ǰ���û�̳�
            p.life = Infinity;
            p.opacity = 1;
            p.vx = 0;
            p.vy = 0;
          } else {
            // ��Ŀ���ƶ�
            p.vx = dx_disperse * this.DISPERSE_SPEED_FACTOR;
            p.vy = dy_disperse * this.DISPERSE_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity = Math.max(0.1, p.life / p.initialLife); // ɢ�������б��ֿɼ�
          }
          break;

        case ParticleState.TRAIL:
          p.opacity = Math.max(0, p.life / p.initialLife);
          if (p.opacity <= 0) {
            // ˫�ؼ�飬����life <= 0 �����Ƴ�
            this.particles.splice(i, 1);
            continue;
          }
          break;
      }
    }
  }

  private drawParticles(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p) => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      //fillRect��x,y�����Ͻǣ�Ϊ����1px������У�������΢����
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
  }

  private animate(): void {
    // �����ǰʵ�����Ǽ���״̬����ִ���κβ�����ֹͣ����ѭ��
    if (!this.isActive) {
      this.animationFrameId = null; // ȷ��ID�����
      return;
    }
    this.updateSystemState(); // ��������Ƿ�ֹ��״̬
    this.spawnParticles(); // ����״̬����������
    this.updateParticles(); // �����������ӵ�״̬��λ��
    this.drawParticles(); // ��������
    // console.log('Animating particles:', this.particles.length);
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
    this.cancelLongPressState(); // ������ض��ڳ���������
  }
}

// // DOM������Ϻ��ʼ��
// document.addEventListener("DOMContentLoaded", () => {
//   try {
//     new AdvancedParticleSystem("particleCanvas", "particleArea");
//   } catch (error) {
//     console.error("Failed to initialize particle system:", error);
//     const area = document.getElementById("particleArea");
//     if (area) {
//       area.innerHTML = `<p style="color:red; text-align:center; margin-top: 20px;">Error initializing particle effect. Check console.</p>`;
//     }
//   }
// });
//Cursor1.ts ��� DOMContentLoaded �¼���������ҳ����μ���ʱ��ִ�У���ʱReact �����û���أ�ҳ���ϻ�û�� particleArea �� particleCanvas�����Իᱨ�Ҳ���Ԫ�صĴ���

export default AdvancedParticleSystem;