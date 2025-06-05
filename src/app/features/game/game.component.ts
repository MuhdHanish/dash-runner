import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
})
export class GameComponent implements AfterViewInit {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private width = 400;
  private height = 700;
  private gameOver = false;
  private baseSpeed = 2;
  private maxSpeed = 8;
  private speedIncrement = 0.002;
  private currentSpeed = this.baseSpeed;
  private score = 0;
  private highScore = 0;

  private player = {
    x: 50,
    y: 600,
    width: 40,
    height: 40,
    vy: 0,
    jumping: false,
  };
  private gravity = 1;
  private obstacles: { x: number; y: number; width: number; height: number }[] =
    [];

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = this.width;
    canvas.height = this.height;

    window.addEventListener('keydown', this.handleInput.bind(this));
    this.loop();
    canvas.addEventListener('click', () => {
      if (this.gameOver) {
        this.resetGame();
      } else if (!this.player.jumping) {
        this.player.vy = -20;
        this.player.jumping = true;
      }
    });
    this.highScore = Number(localStorage.getItem('highScore')) || 0;
  }

  private handleInput(e: KeyboardEvent) {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !this.player.jumping) {
      this.player.vy = -20;
      this.player.jumping = true;
    }
  }

  private update() {
    this.currentSpeed = Math.min(
      this.currentSpeed + this.speedIncrement,
      this.maxSpeed
    );
    this.player.vy += this.gravity;
    this.player.y += this.player.vy;

    if (this.player.y >= this.height - this.player.height) {
      this.player.y = this.height - this.player.height;
      this.player.jumping = false;
    }

    this.obstacles.forEach((ob) => (ob.x -= this.currentSpeed));
    if (Math.random() < 0.02) {
      this.obstacles.push({
        x: this.width,
        y: this.height - 30,
        width: 30,
        height: 30,
      });
    }

    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.width > 0);
    for (const ob of this.obstacles) {
      if (this.isColliding(this.player, ob)) {
        this.gameOver = true;
        return;
      }
    }
    this.score += this.currentSpeed * 0.1;
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Player (Jumper)
    const { x, y, width, height } = this.player;
    const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#22d3ee'); // cyan
    gradient.addColorStop(1, '#0ea5e9'); // blue
    this.ctx.fillStyle = gradient;
    this.roundRect(x, y, width, height, 10);

    // Draw Obstacles
    for (const ob of this.obstacles) {
      this.ctx.fillStyle = '#7f1d1d'; // rich red
      this.roundRect(ob.x, ob.y, ob.width, ob.height, 6);
    }
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private loop = () => {
    if (!this.gameOver) {
      this.update();
      this.draw();
      requestAnimationFrame(this.loop);
    } else {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('highScore', this.highScore.toFixed(0));
      }
      this.drawGameOver();
    }
  };

  private isColliding(player: any, obstacle: any): boolean {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  }

  private drawGameOver() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', this.width / 2, this.height / 2);
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Tap to Restart', this.width / 2, this.height / 2 + 40);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Score: ${this.score.toFixed(0)}`, this.width / 2, 30);
    this.ctx.fillText(
      `High Score: ${this.highScore.toFixed(0)}`,
      this.width / 2,
      50
    );
  }

  private resetGame() {
    this.gameOver = false;
    this.player.y = this.height - this.player.height;
    this.player.vy = 0;
    this.player.jumping = false;
    this.obstacles = [];
    this.currentSpeed = this.baseSpeed;
    this.score = 0;
    this.loop();
  }
}
