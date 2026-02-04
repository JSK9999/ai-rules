import chalk from 'chalk';
import ora from 'ora';
import {
  selectFiles,
  selectFilesWithKeywords,
  isSemanticRouterEnabled,
  getKeywordMap
} from '../utils/semantic-router.js';
import { detectInstall } from '../utils/files.js';

export interface TestOptions {
  keyword?: boolean;  // 키워드 방식만 사용
}

export async function test(input: string, options: TestOptions = {}): Promise<void> {
  const install = detectInstall();

  if (!install) {
    console.log(chalk.yellow('ai-rules가 설치되지 않았습니다.'));
    console.log(chalk.gray('먼저 ai-rules init 또는 ai-rules install을 실행하세요.'));
    return;
  }

  console.log(chalk.cyan('\n🔍 규칙 라우팅 테스트\n'));
  console.log(chalk.gray(`입력: "${input}"`));
  console.log();

  const spinner = ora('규칙 선택 중...').start();

  try {
    let result;

    if (options.keyword) {
      // 키워드 방식만 사용
      const files = selectFilesWithKeywords(input);
      result = { files, method: 'keyword' as const };
    } else {
      // Semantic Router 사용 (가능한 경우)
      result = await selectFiles(input);
    }

    spinner.stop();

    // 사용된 방식 표시
    const methodLabel = result.method === 'semantic'
      ? chalk.magenta('AI (Semantic Router)')
      : chalk.blue('키워드 매칭');

    console.log(chalk.gray(`방식: ${methodLabel}`));

    if (result.method === 'keyword' && isSemanticRouterEnabled()) {
      console.log(chalk.gray('(AI 선택 실패, 키워드로 폴백)'));
    } else if (result.method === 'keyword' && !options.keyword) {
      console.log(chalk.gray('(SEMANTIC_ROUTER_ENABLED=true 및 API 키 필요)'));
    }

    console.log();

    if (result.files.length === 0) {
      console.log(chalk.yellow('선택된 규칙 파일이 없습니다.'));
      console.log();
      console.log(chalk.gray('키워드 매칭에 사용되는 키워드:'));
      const keywords = Object.keys(getKeywordMap()).slice(0, 10);
      console.log(chalk.gray(`  ${keywords.join(', ')} ...`));
    } else {
      console.log(chalk.green(`선택된 파일 (${result.files.length}개):`));
      for (const file of result.files) {
        console.log(chalk.white(`  • ${file}`));
      }
    }

    console.log();

  } catch (error) {
    spinner.fail('오류 발생');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
}

export async function testKeywords(): Promise<void> {
  console.log(chalk.cyan('\n📚 등록된 키워드 목록\n'));

  const keywordMap = getKeywordMap();
  const categories = ['rules', 'commands', 'skills', 'agents', 'contexts'] as const;

  // 카테고리별로 그룹화
  const byCategory: Record<string, string[]> = {};

  for (const [keyword, files] of Object.entries(keywordMap)) {
    for (const category of categories) {
      if (files[category]?.length) {
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push(keyword);
      }
    }
  }

  for (const category of categories) {
    if (byCategory[category]?.length) {
      console.log(chalk.yellow(`${category}/`));
      const unique = [...new Set(byCategory[category])];
      console.log(chalk.gray(`  키워드: ${unique.join(', ')}`));
      console.log();
    }
  }

  // Semantic Router 상태
  console.log(chalk.gray('─'.repeat(40)));
  if (isSemanticRouterEnabled()) {
    console.log(chalk.green('✓ Semantic Router 활성화됨'));
  } else {
    console.log(chalk.yellow('○ Semantic Router 비활성화'));
    console.log(chalk.gray('  활성화: SEMANTIC_ROUTER_ENABLED=true'));
    console.log(chalk.gray('  API 키: ANTHROPIC_API_KEY 또는 OPENAI_API_KEY'));
  }
  console.log();
}
