


enum ParticleState {
  ORBITAL,   // Χ�ƾ�ֹ�������ת
  SHRINKING, // ����꿪ʼ�ƶ�ʱ���ӹ�����������λ��
  TRAIL,     // ����ƶ�ʱ����·���ϵĺۼ�
   DISPERSING_TO_ORBIT, // ���������Ӵ�����ɢ�������
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
  orbitalAngle?: number;   // ��ǰ����Ƕ�
  orbitalRadius?: number;  // ����뾶
  orbitalSpeed?: number;   // �����ת�ٶ�

  // DISPERSING_TO_ORBIT ״̬��Ŀ��
  targetOrbitalX?: number; // Ŀ����X����
  targetOrbitalY?: number; // Ŀ����Y����
  isDispersingTargetSet?: boolean; // ����Ƿ���Ϊ������������ɢ��Ŀ��
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

  // --- ���ò��� ---
  private PARTICLE_SIZE = 1;
  private PARTICLE_COLOR = 'rgba(255, 255, 255, 1)';
  
  private STATIONARY_THRESHOLD_MS = 150; // ��꾲ֹ���ٺ�����ж�Ϊ��ֹ
  
  private NUM_ORBITAL_PARTICLES = 60;    // ��ֹʱ���Ƶ���������
  private ORBITAL_RADIUS_MIN = 20;       // �����С�뾶
  private ORBITAL_RADIUS_MAX = 40;       // ������뾶
  private ORBITAL_BASE_SPEED = 0.01;     // ������ת�ٶ� (����/֡)
  private ORBITAL_SPEED_VARIATION = 0.02;

  private SHRINK_SPEED_FACTOR = 0.15;     // ����ʱ������ƶ����ٶ����� (0-1)
  private SHRINK_SNAP_DISTANCE = 5;      // ����ʱ�������ʱ�ж�Ϊ����
  private SHRINK_LIFE = 75;              // ����״̬���ӵ��������� (֡)

    private DISPERSE_SPEED_FACTOR = 0.08; // ɢ��������۵��ٶ�����
  private DISPERSE_LIFE = 90;           // ɢ���������������� (֡)
  private DISPERSE_SNAP_DISTANCE = 2;   // ɢ��ʱ��Ŀ������������ȥ

  private TRAIL_PARTICLES_PER_MOVE = 2; // ÿ������ƶ���֡�������Ĺ켣������
  private TRAIL_LIFE_MIN = 20;           // �켣���������������
  private TRAIL_LIFE_MAX = 50;           // �켣�������������
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
    this.mouse.x = this.canvas.width / 2; // ��ʼ���λ��
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
    // ������Ƴ�����ʱ�����ǿ���ϣ������������ӻ�ֹͣ����
    this.areaElement.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    this.mouse.lastMoveTime = Date.now();

    if (this.isMouseStationary) { // ���֮ǰ�Ǿ�ֹ�ģ����ڿ�ʼ�ƶ���
      this.isMouseStationary = false; // ��ϵͳ���Ϊ���ƶ��С�
      
      this.particles.forEach(p => {
        // �������֮ǰ�� ORBITAL ״̬���������� DISPERSING_TO_ORBIT����ɢ������У�
        // ��ô������Ӧ�������л��� SHRINKING ״̬���������
        if (p.state === ParticleState.ORBITAL || p.state === ParticleState.DISPERSING_TO_ORBIT) {
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
      });
    }
    // ���������ƶ�ʱ��spawnParticles ��������� isMouseStationary ��־���� TRAIL ����
  }
  
  private handleMouseLeave(): void {
    // ����Ƴ�ʱ�����������ӿ��ٱ��Ϊ������ת��Ϊ����״̬
    this.isMouseStationary = false; // ȷ���������µĹ������
     this.particles.forEach(p => {
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
    if (!this.isMouseStationary && (now - this.mouse.lastMoveTime > this.STATIONARY_THRESHOLD_MS)) {
      this.isMouseStationary = true;
      this.stationaryAnchor = { x: this.mouse.x, y: this.mouse.y };
      // �������ORBITAL�����ӣ�������������Ȼ��ʧ
      // ����ѡ����������Ȼ��ʧ���µ�ORBITAL���ӻᰴ�贴��

      // ѡ���������ӣ���Ҫ��TRAIL�����������ģ�����ɢ��
      // ��������ѡ����Щ�������ڽϳ����մ����ģ����߿�����ǰ���λ�õ�����
      const candidatesForDispersal = this.particles.filter(p => 
        p.state === ParticleState.TRAIL || 
        (p.state === ParticleState.SHRINKING && p.life > 0) // �����������������е�����
      ).sort((a, b) => { // ����������ѡ����������
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
        p.vx = 0; // �����ٶȣ�������Ŀ�����
        p.vy = 0;
        p.isDispersingTargetSet = false; // �����Ҫ����ɢ��Ŀ��
        // ����������� updateParticles ��Ϊ DISPERSING_TO_ORBIT ״̬�������趨Ŀ��ʱȷ��
        p.orbitalAnchorX = this.stationaryAnchor.x; // ��������ǵ�ǰ��ֹ��
        p.orbitalAnchorY = this.stationaryAnchor.y;
        p.orbitalSpeed = this.ORBITAL_BASE_SPEED + (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION; // Ԥ����ת�ٶ�
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
          // �����µ����ӣ������Ǵ����Ŀ�ʼɢ��
          this.particles.push({
            id: this.particleIdCounter++,
            x: this.stationaryAnchor.x, // �Ӿ�ֹ���Ŀ�ʼ
            y: this.stationaryAnchor.y,
            vx: 0, vy: 0,
            opacity: 0.1, // ��ʼʱ������΢͸��
            life: this.DISPERSE_LIFE,
            initialLife: this.DISPERSE_LIFE,
            size: this.PARTICLE_SIZE,
            color: this.PARTICLE_COLOR,
            state: ParticleState.DISPERSING_TO_ORBIT,
            isDispersingTargetSet: false, // ����updateParticles������Ŀ��
            orbitalAnchorX: this.stationaryAnchor.x,
            orbitalAnchorY: this.stationaryAnchor.y,
            orbitalSpeed: this.ORBITAL_BASE_SPEED + (Math.random() - 0.5) * this.ORBITAL_SPEED_VARIATION,
          });
        }
      }
    } else { // ��������ƶ�
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

      if (p.state !== ParticleState.ORBITAL || p.life !== Infinity) { // ORBITAL��lifeΪInfinity�����Ӳ�������life
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

        case ParticleState.SHRINKING: // ����׷�����
          const dx_shrink = this.mouse.x - p.x;
          const dy_shrink = this.mouse.y - p.y;
          const dist_shrink = Math.sqrt(dx_shrink * dx_shrink + dy_shrink * dy_shrink);

          if (dist_shrink < this.SHRINK_SNAP_DISTANCE || p.life <=0) {
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

        case ParticleState.DISPERSING_TO_ORBIT: // ����������ɢ�������
          if (!p.isDispersingTargetSet && p.orbitalAnchorX !== undefined && p.orbitalAnchorY !== undefined) {
            // Ϊ�������ڹ���Ϸ���һ�������Ŀ��λ��
            p.orbitalAngle = Math.random() * Math.PI * 2; // ���յĹ���Ƕ�
            p.orbitalRadius = this.ORBITAL_RADIUS_MIN + Math.random() * (this.ORBITAL_RADIUS_MAX - this.ORBITAL_RADIUS_MIN); // ���յĹ���뾶
            
            p.targetOrbitalX = p.orbitalAnchorX + Math.cos(p.orbitalAngle) * p.orbitalRadius;
            p.targetOrbitalY = p.orbitalAnchorY + Math.sin(p.orbitalAngle) * p.orbitalRadius;
            p.isDispersingTargetSet = true;
            p.opacity = Math.max(0.1, p.opacity); // ��ʼɢ��ʱȷ���ɼ�
          }

          if (p.targetOrbitalX === undefined || p.targetOrbitalY === undefined || p.life <= 0) {
            // ���û��Ŀ��������ľ�������ֱ��תΪORBITAL���Ƴ�
             if(p.life > 0 && p.targetOrbitalX !== undefined && p.targetOrbitalY !== undefined){ // �������������ǿ������Ϊ���״̬
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
            // ����Ŀ�꣬ת����ORBITAL״̬
            p.state = ParticleState.ORBITAL;
            p.x = p.targetOrbitalX; // ��ȷ��λ
            p.y = p.targetOrbitalY;
            // orbitalAngle, orbitalRadius, orbitalSpeed, orbitalAnchorX/Y ����֮ǰ���û�̳�
            p.life = Infinity; 
            p.opacity = 1;
            p.vx = 0; p.vy = 0;
          } else {
            // ��Ŀ���ƶ�
            p.vx = dx_disperse * this.DISPERSE_SPEED_FACTOR;
            p.vy = dy_disperse * this.DISPERSE_SPEED_FACTOR;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity = Math.max(0.1, (p.life / p.initialLife)); // ɢ�������б��ֿɼ�
          }
          break;

        case ParticleState.TRAIL:
          p.opacity = Math.max(0, p.life / p.initialLife);
          if (p.opacity <= 0) { // ˫�ؼ�飬����life <= 0 �����Ƴ�
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
      //fillRect��x,y�����Ͻǣ�Ϊ����1px������У�������΢����
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
  }

  private animate(): void {
    this.updateSystemState(); // ��������Ƿ�ֹ��״̬
    this.spawnParticles();    // ����״̬����������
    this.updateParticles();   // �����������ӵ�״̬��λ��
    this.drawParticles();     // ��������
    requestAnimationFrame(this.animate.bind(this));
  }
}

// DOM������Ϻ��ʼ��
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