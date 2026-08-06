import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, RouterModule],
})


export class HomeComponent {

  title = 'fed-angular-npm-template';
  LiquidCorp: any;
  internalUrls = {
    bradescodeFed: 'https://confluence.bradesco.com.br:8443/pages/viewpage.action?pageId=240148867',
    bradescodeDevTools: 'https://confluence.bradesco.com.br:8443/pages/viewpage.action?pageId=3192422710',

  }
}
